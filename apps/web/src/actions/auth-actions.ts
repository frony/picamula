'use server';

import { apiClient } from '@/lib/api-client';
import { LOCAL_STORAGE_KEYS } from '@junta-tribo/shared';
import type { 
  AuthResponse, 
  SignUpResponse,
  LoginDto, 
  RegisterDto, 
  User
} from '@junta-tribo/shared';

interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Login user
export async function loginUser(data: LoginDto): Promise<ActionResult> {
  try {
    const response = await apiClient.post<AuthResponse>('/authentication/sign-in', data, { skipAuth: true });
    
    // Store token in localStorage (this will be handled by the client-side code)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, response.accessToken);
    }
    
    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.error('Error logging in:', error);
    return {
      success: false,
      error: error.message || 'Failed to log in'
    };
  }
}

// Register user
export async function registerUser(data: RegisterDto): Promise<ActionResult> {
  try {
    const response = await apiClient.post<SignUpResponse>('/authentication/sign-up', data, { skipAuth: true });
    
    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.error('Error registering user:', error);
    return {
      success: false,
      error: error.message || 'Failed to register user'
    };
  }
}

// Logout user
export async function logoutUser(): Promise<ActionResult> {
  try {
    await apiClient.post('/authentication/logout');
    
    // Clear stored auth data
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA);
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error logging out:', error);
    return {
      success: false,
      error: error.message || 'Failed to log out'
    };
  }
}

// Get current user
export async function getCurrentUser(): Promise<ActionResult> {
  try {
    const user = await apiClient.get<User>('/users/me');
    
    return {
      success: true,
      data: user
    };
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch user data'
    };
  }
}

// Refresh token
export async function refreshToken(): Promise<ActionResult> {
  try {
    const response = await apiClient.post<AuthResponse>('/authentication/refresh-tokens', {});
    
    // Update stored token
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, response.accessToken);
    }
    
    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return {
      success: false,
      error: error.message || 'Failed to refresh token'
    };
  }
}
