import axios, { AxiosResponse } from 'axios'
import { API_ENDPOINTS, LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'
import type { 
  AuthResponse, 
  SignUpResponse,
  LoginDto, 
  RegisterDto, 
  User, 
  Trip, 
  CreateTripDto, 
  UpdateTripDto,
  UpdateUserDto,
  Note,
  CreateNoteDto,
  UpdateNoteDto,
  TripExpense,
  CreateTripExpenseDto,
  UpdateTripExpenseDto,
  TripExpensesSummary,
} from '@junta-tribo/shared'

// Function to get auth store for token updates
const getAuthStore = () => {
  if (typeof window !== 'undefined') {
    try {
      // Dynamic import to avoid SSR issues
      const { useAuth } = require('@/hooks/use-auth')
      return useAuth.getState()
    } catch (error) {
      return null
    }
  }
  return null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token
        const refreshResponse = await authApi.refreshToken()
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data

        // Update the stored tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, accessToken)
          if (newRefreshToken) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken)
          }
          // Update the auth store if available
          const authStore = getAuthStore()
          if (authStore?.updateToken) {
            authStore.updateToken(accessToken)
          }
        }

        // Update the authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`

        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, clear auth data and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
          localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA)
          // Clear auth store if available
          const authStore = getAuthStore()
          if (authStore?.logout) {
            authStore.logout()
          }
          window.location.href = '/'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (data: LoginDto): Promise<AxiosResponse<AuthResponse>> =>
    api.post(API_ENDPOINTS.AUTH.LOGIN, data),
  
  register: (data: RegisterDto): Promise<AxiosResponse<SignUpResponse>> =>
    api.post(API_ENDPOINTS.AUTH.REGISTER, data),
  
  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post(API_ENDPOINTS.AUTH.LOGOUT),
  
  me: (): Promise<AxiosResponse<User>> =>
    api.get(API_ENDPOINTS.AUTH.ME),
  
  refreshToken: (): Promise<AxiosResponse<AuthResponse>> => {
    const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN)
    return api.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken })
  },
  
  verifyEmail: (token: string): Promise<AxiosResponse<{ message: string }>> =>
    api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token }),
}

// Users API
export const usersApi = {
  getAll: (): Promise<AxiosResponse<User[]>> =>
    api.get(API_ENDPOINTS.USERS.BASE),
  
  getById: (id: number): Promise<AxiosResponse<User>> =>
    api.get(`${API_ENDPOINTS.USERS.BASE}/${id}`),
  
  updateProfile: (data: UpdateUserDto): Promise<AxiosResponse<User>> =>
    api.patch(API_ENDPOINTS.USERS.ME, data),
  
  update: (id: number, data: UpdateUserDto): Promise<AxiosResponse<User>> =>
    api.patch(`${API_ENDPOINTS.USERS.BASE}/${id}`, data),
  
  deactivateProfile: (): Promise<AxiosResponse<User>> =>
    api.delete(API_ENDPOINTS.USERS.ME),
  
  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`${API_ENDPOINTS.USERS.BASE}/${id}`),
  
  getByEmails: (emails: string[]): Promise<AxiosResponse<User[]>> =>
    api.get(`${API_ENDPOINTS.USERS.BASE}/by-emails`, {
      params: { emails: emails.join(',') }
    }),
}

// Trips API
export const tripsApi = {
  getAll: (status?: string): Promise<AxiosResponse<Trip[]>> => {
    const params = status ? { status } : {}
    return api.get(API_ENDPOINTS.TRIPS.BASE, { params })
  },
  
  getById: (id: string): Promise<AxiosResponse<Trip>> =>
    api.get(`${API_ENDPOINTS.TRIPS.BASE}/${id}`),
  
  getUpcoming: (): Promise<AxiosResponse<Trip[]>> =>
    api.get(API_ENDPOINTS.TRIPS.UPCOMING),
  
  create: (data: CreateTripDto): Promise<AxiosResponse<Trip>> =>
    api.post(API_ENDPOINTS.TRIPS.BASE, data),
  
  update: (id: string, data: UpdateTripDto): Promise<AxiosResponse<Trip>> =>
    api.patch(`${API_ENDPOINTS.TRIPS.BASE}/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`${API_ENDPOINTS.TRIPS.BASE}/${id}`),
}

// Notes API
export const notesApi = {
  getAll: (tripId: string): Promise<AxiosResponse<Note[]>> =>
    api.get(`${API_ENDPOINTS.TRIPS.BASE}/${tripId}/notes`),
  
  getById: (tripId: string, noteId: string): Promise<AxiosResponse<Note>> =>
    api.get(`${API_ENDPOINTS.TRIPS.BASE}/${tripId}/notes/${noteId}`),
  
  create: (tripId: string, data: CreateNoteDto): Promise<AxiosResponse<Note>> =>
    api.post(`${API_ENDPOINTS.TRIPS.BASE}/${tripId}/notes`, data),
  
  update: (tripId: string, noteId: string, data: UpdateNoteDto): Promise<AxiosResponse<Note>> =>
    api.patch(`${API_ENDPOINTS.TRIPS.BASE}/${tripId}/notes/${noteId}`, data),
  
  delete: (tripId: string, noteId: string): Promise<AxiosResponse<void>> =>
    api.delete(`${API_ENDPOINTS.TRIPS.BASE}/${tripId}/notes/${noteId}`),
}

// Media API
export const mediaApi = {
  delete: (tripId: number, mediaId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`${API_ENDPOINTS.TRIPS.BASE}/${tripId}/media/${mediaId}`),
}

// Todos API
export interface TodoItem {
  id: number;
  title: string;
  status: 'pending' | 'completed';
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoDto {
  title: string;
}

export interface UpdateTodoDto {
  status: 'pending' | 'completed';
}

export const todosApi = {
  getAll: (): Promise<AxiosResponse<TodoItem[]>> =>
    api.get('/todos'),
  
  create: (data: CreateTodoDto): Promise<AxiosResponse<TodoItem>> =>
    api.post('/todos', data),
  
  update: (id: number, data: UpdateTodoDto): Promise<AxiosResponse<TodoItem>> =>
    api.patch(`/todos/${id}`, data),
  
  toggle: (id: number): Promise<AxiosResponse<TodoItem>> =>
    api.patch(`/todos/${id}/toggle`),
  
  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/todos/${id}`),
  
  resetAll: (): Promise<AxiosResponse<TodoItem[]>> =>
    api.post('/todos/reset'),
}

// Trip Expenses API
export const tripExpensesApi = {
  getAll: (tripId: number): Promise<AxiosResponse<TripExpense[]>> =>
    api.get('/trip-expenses', { params: { tripId } }),
  
  getById: (id: number): Promise<AxiosResponse<TripExpense>> =>
    api.get(`/trip-expenses/${id}`),
  
  getSummary: (tripId: number): Promise<AxiosResponse<TripExpensesSummary>> =>
    api.get('/trip-expenses/summary', { params: { tripId } }),
  
  create: (data: CreateTripExpenseDto): Promise<AxiosResponse<TripExpense>> =>
    api.post('/trip-expenses', data),
  
  update: (id: number, data: UpdateTripExpenseDto): Promise<AxiosResponse<TripExpense>> =>
    api.patch(`/trip-expenses/${id}`, data),
  
  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/trip-expenses/${id}`),
}

export default api
