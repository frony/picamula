import { LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'
import type { AuthResponse } from '@junta-tribo/shared'

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryCount?: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private static instance: ApiClient;
  private baseURL: string;
  private refreshPromise: Promise<AuthResponse> | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://www.juntatribo.com/api' 
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')
    
    // Set up automatic token refresh when client is created
    if (typeof window !== 'undefined') {
      this.scheduleTokenRefresh();
    }
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Decode JWT token to get expiration time
   */
  private decodeToken(token: string): { exp?: number } | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh() {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (typeof window === 'undefined') return;

    const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (!accessToken) return;

    const decoded = this.decodeToken(accessToken);
    if (!decoded?.exp) return;

    // Calculate time until token expires (in milliseconds)
    const expiresAt = decoded.exp * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh 1 minute before expiration, or immediately if already expired
    const refreshTime = Math.max(0, timeUntilExpiry - 60000);

    console.log(`Token expires in ${Math.floor(timeUntilExpiry / 1000)}s, scheduling refresh in ${Math.floor(refreshTime / 1000)}s`);

    this.tokenRefreshTimer = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('Scheduled token refresh failed:', error);
        // Clear auth and redirect to login
        this.clearAuthAndRedirect();
      }
    }, refreshTime);
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<AuthResponse> {
    // If a refresh is already in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log('Refreshing access token...');

        const response = await fetch(`${this.baseURL}/authentication/refresh-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const authResponse: AuthResponse = await response.json();
        
        // Update stored tokens
        localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, authResponse.accessToken);
        if (authResponse.refreshToken) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, authResponse.refreshToken);
        }

        console.log('Token refreshed successfully');

        // Schedule next refresh
        this.scheduleTokenRefresh();

        return authResponse;
      } finally {
        // Clear the refresh promise so future requests can trigger a new refresh
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Clear authentication data and redirect to login
   */
  private clearAuthAndRedirect() {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA);
    
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    window.location.href = '/login';
  }

  /**
   * Set tokens and schedule refresh (call this after login)
   */
  public setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;

    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, accessToken);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    
    // Schedule automatic refresh
    this.scheduleTokenRefresh();
  }

  /**
   * Clear tokens and cancel scheduled refresh (call this on logout)
   */
  public clearTokens() {
    this.clearAuthAndRedirect();  
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, retryCount = 0, ...requestOptions } = options;
    
    // Add auth header if not skipped
    const headers = new Headers(options.headers);
    if (!skipAuth && typeof window !== 'undefined') {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    headers.set('Content-Type', 'application/json');

    const config: RequestInit = {
      ...requestOptions,
      headers,
    };

    const url = `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401 && !skipAuth && retryCount === 0) {
        try {
          // Try to refresh the token
          const authResponse = await this.refreshAccessToken();
          
          // Retry the original request with new token
          headers.set('Authorization', `Bearer ${authResponse.accessToken}`);
          return this.request<T>(endpoint, { ...options, retryCount: 1 });
        } catch (refreshError) {
          // Refresh failed, clear auth data and redirect to login
          console.error('Token refresh failed:', refreshError);
          this.clearAuthAndRedirect();
          throw new ApiError(401, 'Session expired, please log in again');
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        throw new ApiError(
          response.status,
          errorData.message || `HTTP ${response.status}`,
          errorData
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }

      return response.text() as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(0, 'Network error - please check your connection');
      }
      throw new ApiError(0, 'An unexpected error occurred');
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Health check method to test backend connectivity
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.baseURL}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const apiClient = ApiClient.getInstance();
