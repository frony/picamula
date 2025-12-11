'use client'

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { LoginDto, RegisterDto, SignUpResponse } from '@junta-tribo/shared'
import { authApi } from '@/lib/api'

interface UseAuthReturn {
  user: any | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginDto) => Promise<void>
  register: (userData: RegisterDto) => Promise<SignUpResponse>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()
  const router = useRouter()

  const login = async (credentials: LoginDto & { captchaToken?: string }) => {
    try {
      // Let NextAuth handle the redirect - it will wait for session to be set
      await nextAuthSignIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        captchaToken: credentials.captchaToken,
        callbackUrl: '/',  // Redirect to dashboard (root page) after successful login
        // redirect defaults to true, so NextAuth will handle the redirect
      })
    } catch (error) {
      throw error
    }
  }

  const register = async (userData: RegisterDto): Promise<SignUpResponse> => {
    try {
      const response = await authApi.register(userData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      // Call backend logout endpoint if needed
      await authApi.logout().catch(() => {
        // Continue with logout even if backend call fails
      })
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Sign out with NextAuth
      await nextAuthSignOut({ redirect: false })
      router.push('/login')
      router.refresh()
    }
  }

  return {
    user: session?.user || null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    login,
    register,
    logout,
  }
}
