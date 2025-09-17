import axios, { AxiosResponse } from 'axios'
import { API_ENDPOINTS, LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'
import type { 
  AuthResponse, 
  LoginDto, 
  RegisterDto, 
  User, 
  Trip, 
  CreateTripDto, 
  UpdateTripDto,
  UpdateUserDto 
} from '@junta-tribo/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA)
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (data: LoginDto): Promise<AxiosResponse<AuthResponse>> =>
    api.post(API_ENDPOINTS.AUTH.LOGIN, data),
  
  register: (data: RegisterDto): Promise<AxiosResponse<AuthResponse>> =>
    api.post(API_ENDPOINTS.AUTH.REGISTER, data),
  
  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post(API_ENDPOINTS.AUTH.LOGOUT),
  
  me: (): Promise<AxiosResponse<User>> =>
    api.get(API_ENDPOINTS.AUTH.ME),
}

// Users API
export const usersApi = {
  getAll: (): Promise<AxiosResponse<User[]>> =>
    api.get(API_ENDPOINTS.USERS.BASE),
  
  getById: (id: string): Promise<AxiosResponse<User>> =>
    api.get(`${API_ENDPOINTS.USERS.BASE}/${id}`),
  
  updateProfile: (data: UpdateUserDto): Promise<AxiosResponse<User>> =>
    api.patch(API_ENDPOINTS.USERS.ME, data),
  
  update: (id: string, data: UpdateUserDto): Promise<AxiosResponse<User>> =>
    api.patch(`${API_ENDPOINTS.USERS.BASE}/${id}`, data),
  
  deactivateProfile: (): Promise<AxiosResponse<User>> =>
    api.delete(API_ENDPOINTS.USERS.ME),
  
  delete: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`${API_ENDPOINTS.USERS.BASE}/${id}`),
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
  
  addNote: (id: string, noteData: { content: string; date: string }): Promise<AxiosResponse<Trip>> =>
    api.post(`${API_ENDPOINTS.TRIPS.BASE}/${id}/notes`, noteData),
  
  updateNote: (id: string, noteIndex: number, noteData: { content: string; date: string }): Promise<AxiosResponse<Trip>> =>
    api.patch(`${API_ENDPOINTS.TRIPS.BASE}/${id}/notes/${noteIndex}`, noteData),
}

export default api
