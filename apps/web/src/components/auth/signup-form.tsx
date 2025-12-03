'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import type { RegisterDto } from '@junta-tribo/shared'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Captcha } from './captcha'

interface SignupFormData extends RegisterDto {
  captchaToken?: string;
}

export function SignupForm() {
  const router = useRouter()
  const { register, isLoading } = useAuth()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>()

  const onSubmit = async (data: SignupFormData) => {
    try {
      const registerData = { ...data, captchaToken }
      const result = await register(registerData)
      toast({
        title: 'Success',
        description: `Account created successfully! We've sent a verification email to ${data.email}. Please check your inbox and verify your email before logging in.`,
        duration: 7000,
      })
      router.push('/login?verified=false')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Something went wrong'
      toast({
        title: 'Error',
        description: typeof errorMessage === 'string' ? errorMessage : 'Something went wrong',
        variant: 'destructive',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <Input
          type="text"
          placeholder="First Name"
          {...registerField('firstName', {
            required: 'First name is required',
          })}
        />
        {errors.firstName && (
          <p className="text-sm text-red-500 mt-1">
            {errors.firstName.message}
          </p>
        )}
      </div>

      <div>
        <Input
          type="text"
          placeholder="Last Name"
          {...registerField('lastName', {
            required: 'Last name is required',
          })}
        />
        {errors.lastName && (
          <p className="text-sm text-red-500 mt-1">
            {errors.lastName.message}
          </p>
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPassword(!showPassword)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowPassword(!showPassword)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-1 touch-manipulation"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
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

      <Captcha 
        onSuccess={(token) => setCaptchaToken(token)}
        onError={(error) => console.error('CAPTCHA error:', error)}
      />

      <Button type="submit" className="w-full" disabled={isLoading || !captchaToken}>
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  )
}
