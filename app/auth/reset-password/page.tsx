'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setSuccess(null)

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    const { error: updateError } = await getSupabaseClient().auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message || 'Failed to reset password')
      setIsSubmitting(false)
      return
    }

    setSuccess('Password reset successful. Redirecting to home...')
    setTimeout(() => {
      router.replace('/')
    }, 1200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Reset Password</h1>
        <p className="text-sm text-muted-foreground mb-5">Enter your new password below.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              {isSubmitting && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              )}
              Reset Password
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}

