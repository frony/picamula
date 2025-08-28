'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { authApi } from '@/lib/api'
import { LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'

interface AuthContextType {
  // This context can be extended if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, token } = useAuth()

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
      
      if (storedToken && token) {
        try {
          setLoading(true)
          const response = await authApi.me()
          setUser(response.data)
        } catch (error) {
          // Token is invalid, clear auth data
          localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
          localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA)
          setUser(null)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [setUser, setLoading, token])

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
