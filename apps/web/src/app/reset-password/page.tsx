'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { validateResetToken } from '@/actions/password-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const apiKey = searchParams.get('apiKey')

  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    async function validate() {
      if (!apiKey) {
        setError('Invalid reset link. Please request a new password reset.')
        setIsValidating(false)
        return
      }

      try {
        const result = await validateResetToken(apiKey)
        
        if (result.accessToken) {
          setAccessToken(result.accessToken)
        } else {
          setError(result.error || 'Invalid or expired reset link')
        }
      } catch (err) {
        setError('Failed to validate reset link')
      } finally {
        setIsValidating(false)
      }
    }

    validate()
  }, [apiKey])

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
              <p className="text-sm text-gray-500">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="text-center space-y-2">
              <Link
                href="/forgot-password"
                className="block text-blue-600 hover:underline"
              >
                Request a new reset link
              </Link>
              <Link
                href="/login"
                className="block text-sm text-gray-600 hover:underline"
              >
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <ResetPasswordForm accessToken={accessToken} />
        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
