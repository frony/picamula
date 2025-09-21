'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api'
import { LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'
import type { User, LoginDto, RegisterDto, AuthResponse } from '@junta-tribo/shared'

interface AuthState {
  user: AuthResponse['user'] | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginDto) => Promise<void>
  register: (userData: RegisterDto) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthResponse['user'] | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (credentials: LoginDto) => {
        try {
          set({ isLoading: true })
          const response = await authApi.login(credentials)
          const { accessToken } = response.data

          // Store token in localStorage
          localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, accessToken)
          
          // Get user data separately
          const userResponse = await authApi.me()
          const user = userResponse.data
          
          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (userData: RegisterDto) => {
        try {
          set({ isLoading: true })
          const response = await authApi.register(userData)
          const signUpResponse = response.data
          
          // IAM sign-up doesn't auto-login, just returns user info
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
          
          return signUpResponse // Return for success message
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
          // Clear localStorage
          localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
          localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA)

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      setUser: (user: AuthResponse['user'] | null) => {
        set({ user, isAuthenticated: !!user })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },
    }),
    {
      name: LOCAL_STORAGE_KEYS.USER_DATA,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
