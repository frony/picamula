'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api'
import { apiClient } from '@/lib/api-client'
import { LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'
import type { User, LoginDto, RegisterDto, AuthResponse, SignUpResponse } from '@junta-tribo/shared'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginDto) => Promise<void>
  register: (userData: RegisterDto) => Promise<SignUpResponse>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  updateToken: (token: string) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (credentials: LoginDto) => {
        try {
          set({ isLoading: true })
          const response = await authApi.login(credentials)
          const { accessToken, refreshToken } = response.data

          // Store tokens in localStorage
          localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, accessToken)
          if (refreshToken) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
          }
          
          // Get user data separately
          const userResponse = await authApi.me()
          const user = userResponse.data
          
          set({
            user,
            token: accessToken,
            refreshToken: refreshToken || null,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (userData: RegisterDto): Promise<SignUpResponse> => {
        set({ isLoading: true })
        try {
          const response = await authApi.register(userData)
          const signUpResponse = response.data
          
          // IAM sign-up doesn't auto-login, just returns user info
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
          
          return signUpResponse
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error)
        } finally {
          // Clear tokens and cancel scheduled refresh
          apiClient.clearTokens()

          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },

      updateToken: (token: string) => {
        set({ token })
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token)
        }
      },
    }),
    {
      name: LOCAL_STORAGE_KEYS.USER_DATA,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
