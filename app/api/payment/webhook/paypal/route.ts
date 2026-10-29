import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  confirmSubscriptionPayment,
  PaymentConfirmError,
} from "@/app/api/payment/lib/subscription-payment"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

export const runtime = "nodejs"

function getSupabaseAdmin(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    throw new Error("Supabase admin config missing")
  }

  return createClient(url, key)
}

async function saveWebhookEvent(options: {
  provider: "paypal"
  eventId: string
  eventType: string
  transactionId?: string
  payload: any
  status: "received" | "processed" | "failed" | "ignored"
  errorMessage?: string
}) {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from("webhook_events").upsert(
    {
      provider: options.provider,
      event_id: options.eventId,
      event_type: options.eventType,
      transaction_id: options.transactionId || null,
      status: options.status,
      payload: options.payload,
      error_message: options.errorMessage || null,
      processed_at:
        options.status === "processed" || options.status === "failed"
          ? new Date().toISOString()
          : null,
    },
    { onConflict: "provider,event_id" }
  )

  if (error) {
    console.error("[paypal/webhook] save webhook event failed:", error)
  }
}

async function verifyPayPalSignature(args: {
  body: string
  signature: string | null
  certUrl: string | null
  transmissionId: string | null
  timestamp: string | null
  authAlgo: string | null
}): Promise<boolean> {
  const { body, signature, certUrl, transmissionId, timestamp, authAlgo } = args

  if (
    process.env.NODE_ENV === "development" &&
    process.env.PAYPAL_VERIFY_WEBHOOK !== "true"
  ) {
    return true
  }

  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  const webhookId = process.env.PAYPAL_WEBHOOK_ID

  if (!clientId || !clientSecret || !webhookId) {
    return false
  }

  if (!signature || !certUrl || !transmissionId || !timestamp || !authAlgo) {
    return false
  }

  const mode = process.env.PAYPAL_MODE || process.env.PAYPAL_ENVIRONMENT || "sandbox"
  const baseUrl =
    mode === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com"

  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!tokenRes.ok) {
    return false
  }

  const { access_token } = (await tokenRes.json()) as { access_token?: string }
  if (!access_token) {
    return false
  }

  const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: timestamp,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: signature,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  })

  if (!verifyRes.ok) {
    return false
  }

  const verifyData = (await verifyRes.json()) as { verification_status?: string }
  return verifyData.verification_status === "SUCCESS"
}


async function saveWebhookEventSafe(options: {
  provider: "paypal"
  eventId: string
  eventType: string
  transactionId?: string
  payload: any
  status: "received" | "processed" | "failed" | "ignored"
  errorMessage?: string
}) {
  try {
    await saveWebhookEvent(options)
  } catch (error) {
    console.error("[paypal/webhook] save webhook event fatal:", error)
  }
}

export async function GET() {
  if (resolveDeploymentRegion() !== "INTL") {
    return NextResponse.json({ status: "ignored", reason: "not_intl" }, { status: 200 })
  }

  await saveWebhookEventSafe({
    provider: "paypal",
    eventId: `paypal_health_${Date.now()}`,
    eventType: "healthcheck",
    payload: { source: "manual_get" },
    status: "ignored",
  })

  return NextResponse.json({ status: "ok", provider: "paypal" })
}

function parseCycle(value?: string): "monthly" | "yearly" {
  return value === "yearly" ? "yearly" : "monthly"
}

export async function POST(request: NextRequest) {
  let rawBody = ""

  try {
    if (resolveDeploymentRegion() !== "INTL") {
      await saveWebhookEventSafe({
        provider: "paypal",
        eventId: `paypal_region_${Date.now()}`,
        eventType: "region_rejected",
        payload: { source: "webhook", region: resolveDeploymentRegion() },
        status: "failed",
        errorMessage: "PayPal webhook only available in INTL",
      })

      return NextResponse.json({ error: "PayPal webhook only available in INTL" }, { status: 403 })
    }

    rawBody = await request.text()

    const signature = request.headers.get("paypal-transmission-sig")
    const certUrl = request.headers.get("paypal-cert-url")
    const transmissionId = request.headers.get("paypal-transmission-id")
    const timestamp = request.headers.get("paypal-transmission-time")
    const authAlgo = request.headers.get("paypal-auth-algo")

    const parsedPayload = (() => {
      try {
        return rawBody ? JSON.parse(rawBody) : null
      } catch {
        return null
      }
    })()

    const eventId = parsedPayload?.id || transmissionId || `paypal_${Date.now()}`
    const eventType = parsedPayload?.event_type || "unknown"

    const isValid =
      process.env.PAYPAL_SKIP_SIGNATURE_VERIFICATION === "true"
        ? true
        : await verifyPayPalSignature({
            body: rawBody,
            signature,
            certUrl,
            transmissionId,
            timestamp,
            authAlgo,
          })

    if (!isValid) {
      await saveWebhookEventSafe({
        provider: "paypal",
        eventId,
        eventType,
        payload: parsedPayload || { rawBody },
        status: "failed",
        errorMessage: "Invalid signature",
      })

      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const webhookData = parsedPayload || JSON.parse(rawBody)

    const supportedEvents = new Set([
      "CHECKOUT.ORDER.APPROVED",
      "PAYMENT.CAPTURE.COMPLETED",
    ])

    const resource = webhookData?.resource || {}
    const relatedOrderId = resource?.supplementary_data?.related_ids?.order_id
    const captureId = resource?.id
    const orderId =
      relatedOrderId ||
      resource?.invoice_id ||
      resource?.custom_id ||
      captureId ||
      undefined

    if (!supportedEvents.has(eventType)) {
      await saveWebhookEventSafe({
        provider: "paypal",
        eventId,
        eventType,
        transactionId: orderId,
        payload: webhookData,
        status: "ignored",
      })

      return NextResponse.json({ status: "ignored", eventType })
    }

    if (!orderId) {
      await saveWebhookEventSafe({
        provider: "paypal",
        eventId,
        eventType,
        payload: webhookData,
        status: "failed",
        errorMessage: "Missing order id in PayPal webhook payload",
      })

      return NextResponse.json({ error: "Missing order id" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const txCandidates = [orderId, relatedOrderId, captureId]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())

    let pendingTx: any = null
    for (const txId of txCandidates) {
      const { data } = await supabase
        .from("payment_transactions")
        .select("user_email, plan_type, billing_cycle")
        .eq("transaction_id", txId)
        .maybeSingle()

      if (data) {
        pendingTx = data
        break
      }
    }

    const userEmail = pendingTx?.user_email
    const planId = pendingTx?.plan_type
    const billingCycle = parseCycle(pendingTx?.billing_cycle)

    if (!userEmail || !planId) {
      await saveWebhookEventSafe({
        provider: "paypal",
        eventId,
        eventType,
        transactionId: orderId,
        payload: {
          ...webhookData,
          _debug: {
            orderId,
            relatedOrderId,
            captureId,
            txCandidates,
          },
        },
        status: "failed",
        errorMessage: "No pending transaction found for webhook order id",
      })

      return NextResponse.json(
        { error: "No pending transaction found for order" },
        { status: 404 }
      )
    }

    await saveWebhookEventSafe({
      provider: "paypal",
      eventId,
      eventType,
      transactionId: orderId,
      payload: webhookData,
      status: "received",
    })

    const result = await confirmSubscriptionPayment({
      token: orderId,
      userEmail,
      planId,
      billingCycle,
      paymentMethod: "paypal",
    })

    await saveWebhookEventSafe({
      provider: "paypal",
      eventId,
      eventType,
      transactionId: result.transactionId,
      payload: webhookData,
      status: "processed",
    })

    return NextResponse.json({ status: "success", ...result })
  } catch (error: any) {
    console.error("[paypal/webhook] error:", error)

    try {
      const parsed = rawBody ? JSON.parse(rawBody) : null
      const eventId = parsed?.id || `paypal_unknown_${Date.now()}`
      const eventType = parsed?.event_type || "unknown"
      const transactionId =
        parsed?.resource?.id || parsed?.resource?.supplementary_data?.related_ids?.order_id

      await saveWebhookEventSafe({
        provider: "paypal",
        eventId,
        eventType,
        transactionId,
        payload: parsed || { rawBody },
        status: "failed",
        errorMessage: error?.message || "PayPal webhook failed",
      })
    } catch {
      // ignore logging failure
    }

    if (error instanceof PaymentConfirmError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
