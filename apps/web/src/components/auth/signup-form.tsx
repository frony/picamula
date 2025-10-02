'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import type { RegisterDto } from '@junta-tribo/shared'

interface SignupFormData extends RegisterDto {}

export function SignupForm() {
  const router = useRouter()
  const { register, isLoading } = useAuth()
  const { toast } = useToast()

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>()

  const onSubmit = async (data: SignupFormData) => {
    try {
      const result = await register(data)
      toast({
        title: 'Success',
        description: `Account created successfully! Welcome ${result.firstName} ${result.lastName}. Please log in to continue.`,
      })
      router.push('/login')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Something went wrong',
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
        <Input
          type="password"
          placeholder="Password"
          {...registerField('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          })}
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  )
}
