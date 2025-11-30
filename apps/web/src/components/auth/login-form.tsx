'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import type { LoginDto } from '@junta-tribo/shared'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Eye, EyeOff } from 'lucide-react'

interface LoginFormData extends LoginDto {}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading } = useAuth()
  const { toast } = useToast()
  const showVerificationMessage = searchParams.get('verified') === 'false'
  const [showPassword, setShowPassword] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data)
      toast({
        title: 'Success',
        description: 'Logged in successfully!',
      })
      router.push('/')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Something went wrong'
      
      // Check if error is related to email verification
      if (errorMessage.toLowerCase().includes('verify') || 
          errorMessage.toLowerCase().includes('verification')) {
        toast({
          title: 'Email Not Verified',
          description: 'Please verify your email address before logging in. Check your inbox for the verification link.',
          variant: 'destructive',
          duration: 7000,
        })
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {showVerificationMessage && (
        <Alert className="bg-blue-50 border-blue-200">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Please check your email and verify your account before logging in.
          </AlertDescription>
        </Alert>
      )}
      <div>
        <Input
          type="email"
          placeholder="Email"
          {...registerField('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            {...registerField('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}
