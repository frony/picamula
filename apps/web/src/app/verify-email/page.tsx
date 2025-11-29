'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import Link from 'next/link'

type VerificationState = 'verifying' | 'success' | 'error'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<VerificationState>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setState('error')
        setErrorMessage('No verification token provided')
        return
      }

      try {
        await authApi.verifyEmail(token)
        setState('success')
      } catch (error: any) {
        setState('error')
        const message = error.response?.data?.message || 'Verification failed. Please try again.'
        setErrorMessage(message)
      }
    }

    verifyEmail()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="juntatribo text-primary">JuntaTribo</CardTitle>
          <CardDescription>Email Verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {state === 'verifying' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-center text-muted-foreground">
                Verifying your email address...
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-green-700">
                  Email Verified Successfully!
                </h3>
                <p className="text-muted-foreground">
                  Your email has been verified. You can now sign in to your account.
                </p>
              </div>
              <Button asChild className="w-full mt-4">
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-red-700">
                  Verification Failed
                </h3>
                <p className="text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full mt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/signup">
                    Sign Up Again
                  </Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/login">
                    Try Signing In
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
