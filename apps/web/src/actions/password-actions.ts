'use server'

import { apiClient } from '@/lib/api-client'

export interface SendPasswordTokenResult {
  success: boolean
  error?: string
}

export interface ResetPasswordResult {
  success: boolean
  error?: string
}

export async function sendPasswordToken(email: string, captchaToken: string): Promise<SendPasswordTokenResult> {
  try {
    await apiClient.post('/authentication/sendResetToken', { 
      email,
      captchaToken 
    }, { skipAuth: true })
    return { success: true }
  } catch (error: any) {
    console.error('Send password token error:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to send reset email. Please try again.' 
    }
  }
}

export async function validateResetToken(token: string): Promise<{ accessToken?: string; error?: string }> {
  try {
    const response = await apiClient.get<{ accessToken: string }>(`/authentication/validateResetToken/${token}`, { skipAuth: true })
    return { accessToken: response.accessToken }
  } catch (error: any) {
    console.error('Validate reset token error:', error)
    return { 
      error: error.response?.data?.message || 'Invalid or expired reset token' 
    }
  }
}

export async function resetPassword(
  password: string,
  accessToken: string
): Promise<ResetPasswordResult> {
  try {
    await apiClient.post(
      '/authentication/updatePassword',
      { password },
      {
        skipAuth: true,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    return { success: true }
  } catch (error: any) {
    console.error('Reset password error:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to reset password. Please try again.' 
    }
  }
}
