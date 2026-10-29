"use client"

import Link from "next/link"
import { XCircle } from "lucide-react"

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        <XCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-6">
          Your payment was cancelled. You can retry anytime.
        </p>
        <div className="space-y-3">
          <Link
            href="/subscription"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground"
          >
            Retry Credits Purchase
          </Link>
          <Link
            href="/subscription"
            className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 font-medium"
          >
            Back to Credit Packages
          </Link>
        </div>
      </div>
    </div>
  )
}
