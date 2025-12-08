'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { sendPasswordToken } from '@/actions/password-actions'
import { Mail, CheckCircle2 } from 'lucide-react'
import { Captcha } from './captcha'

interface ForgotPasswordFormData {
  email: string
}

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>()

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (!captchaToken) {
      setError('Please complete the verification challenge')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await sendPasswordToken(data.email, captchaToken)
      
      if (result.success) {
        setEmailSent(true)
      } else {
        setError(result.error || 'Failed to send reset email')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token)
    setError(null)
  }

  const handleCaptchaError = (error: string) => {
    setCaptchaToken(null)
    setError(error)
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We've sent you a password reset link. Please check your inbox and spam folder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              setEmailSent(false)
              setCaptchaToken(null)
              reset()
            }}
            variant="outline"
            className="w-full"
          >
            Send another email
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <div className="relative">
              <Input
                type="email"
                placeholder="Email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className="pl-10"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <Captcha 
            onSuccess={handleCaptchaSuccess}
            onError={handleCaptchaError}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !captchaToken}
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
