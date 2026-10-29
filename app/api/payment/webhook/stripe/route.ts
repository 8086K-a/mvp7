import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
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

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  return new Stripe(key, {
    apiVersion: "2025-10-29.clover",
  })
}

function getQueryParam(rawUrl: unknown, key: string): string | undefined {
  if (typeof rawUrl !== "string") return undefined

  try {
    const parsed = new URL(rawUrl)
    return parsed.searchParams.get(key) || undefined
  } catch {
    return undefined
  }
}


function getStripeWebhookSecrets(): string[] {
  const raw = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim()
  if (!raw) return []

  return raw
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function constructVerifiedStripeEvent(options: {
  stripe: Stripe
  payload: Buffer
  signature: string
  secrets: string[]
}) {
  let lastError: unknown = null

  for (const secret of options.secrets) {
    try {
      return options.stripe.webhooks.constructEvent(options.payload, options.signature, secret)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error("Stripe webhook signature verification failed")
}

async function saveWebhookEvent(options: {
  provider: "stripe"
  eventId: string
  eventType: string
  transactionId?: string
  payload: any
  status: "received" | "processed" | "failed" | "ignored"
  errorMessage?: string
}) {
  const supabase = getSupabaseAdmin()

  const payload = {
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
  }

  const { error } = await supabase
    .from("webhook_events")
    .upsert(payload, { onConflict: "provider,event_id" })

  if (error) {
    console.error("[stripe/webhook] save webhook event failed:", error)
  }
}


async function saveWebhookEventSafe(options: {
  provider: "stripe"
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
    console.error("[stripe/webhook] save webhook event fatal:", error)
  }
}

export async function GET() {
  if (resolveDeploymentRegion() !== "INTL") {
    return NextResponse.json({ status: "ignored", reason: "not_intl" }, { status: 200 })
  }

  await saveWebhookEventSafe({
    provider: "stripe",
    eventId: `stripe_health_${Date.now()}`,
    eventType: "healthcheck",
    payload: { source: "manual_get" },
    status: "ignored",
  })

  return NextResponse.json({ status: "ok", provider: "stripe" })
}

export async function POST(request: NextRequest) {
  let rawBody = ""
  let rawPayloadBuffer: Buffer = Buffer.from("")

  try {
    if (resolveDeploymentRegion() !== "INTL") {
      await saveWebhookEventSafe({
        provider: "stripe",
        eventId: `stripe_region_${Date.now()}`,
        eventType: "region_rejected",
        payload: { source: "webhook", region: resolveDeploymentRegion() },
        status: "failed",
        errorMessage: "Stripe webhook only available in INTL",
      })

      return NextResponse.json({ error: "Stripe webhook only available in INTL" }, { status: 403 })
    }

    rawPayloadBuffer = Buffer.from(await request.arrayBuffer())
    rawBody = rawPayloadBuffer.toString("utf8")
    const signature = request.headers.get("stripe-signature")
    const webhookSecrets = getStripeWebhookSecrets()

    if (!signature || webhookSecrets.length === 0) {
      await saveWebhookEventSafe({
        provider: "stripe",
        eventId: `stripe_missing_signature_${Date.now()}`,
        eventType: "signature_or_secret_missing",
        payload: { hasSignature: Boolean(signature), webhookSecretCount: webhookSecrets.length, rawBody },
        status: "failed",
        errorMessage: "Missing Stripe signature or STRIPE_WEBHOOK_SECRET",
      })

      return NextResponse.json(
        { error: "Missing Stripe signature or STRIPE_WEBHOOK_SECRET" },
        { status: 400 }
      )
    }

    const stripe = getStripeClient()
    const event = constructVerifiedStripeEvent({
      stripe,
      payload: rawPayloadBuffer,
      signature,
      secrets: webhookSecrets,
    })

    const eventId = event.id
    const eventType = event.type
    const object = event.data.object as any
    const sessionId = object?.id

    const interestedEvents = new Set([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ])

    if (!interestedEvents.has(eventType)) {
      await saveWebhookEventSafe({
        provider: "stripe",
        eventId,
        eventType,
        transactionId: sessionId,
        payload: event,
        status: "ignored",
      })

      return NextResponse.json({ status: "ignored", eventType })
    }

    if (!sessionId) {
      await saveWebhookEventSafe({
        provider: "stripe",
        eventId,
        eventType,
        payload: event,
        status: "failed",
        errorMessage: "Missing session id in webhook payload",
      })

      return NextResponse.json({ error: "Missing session id" }, { status: 400 })
    }

    const { success_url, metadata, customer_details, customer_email } = object || {}
    const fallbackPlanId = getQueryParam(success_url, "planId")
    const fallbackCycle = getQueryParam(success_url, "cycle")

    const planId = metadata?.planId || fallbackPlanId || undefined
    const billingCycle = (metadata?.billingCycle || fallbackCycle || "monthly") as
      | "monthly"
      | "yearly"

    const userEmail =
      metadata?.userEmail || customer_details?.email || customer_email || undefined

    if (!planId || !userEmail) {
      await saveWebhookEventSafe({
        provider: "stripe",
        eventId,
        eventType,
        transactionId: sessionId,
        payload: event,
        status: "failed",
        errorMessage: "Missing planId/userEmail for confirmation",
      })

      return NextResponse.json(
        { error: "Missing planId or userEmail in Stripe webhook payload" },
        { status: 400 }
      )
    }

    await saveWebhookEventSafe({
      provider: "stripe",
      eventId,
      eventType,
      transactionId: sessionId,
      payload: event,
      status: "received",
    })

    const result = await confirmSubscriptionPayment({
      sessionId,
      planId,
      userEmail,
      billingCycle: billingCycle === "yearly" ? "yearly" : "monthly",
      paymentMethod: "stripe",
    })

    await saveWebhookEventSafe({
      provider: "stripe",
      eventId,
      eventType,
      transactionId: result.transactionId,
      payload: event,
      status: "processed",
    })

    return NextResponse.json({ status: "success", ...result })
  } catch (error: any) {
    console.error("[stripe/webhook] error:", error)

    try {
      const parsed = rawBody ? JSON.parse(rawBody) : null
      const eventId = parsed?.id || `stripe_unknown_${Date.now()}`
      const eventType = parsed?.type || "unknown"
      const transactionId = parsed?.data?.object?.id

      await saveWebhookEventSafe({
        provider: "stripe",
        eventId,
        eventType,
        transactionId,
        payload: parsed || { rawBody },
        status: "failed",
        errorMessage: error?.message || "Stripe webhook failed",
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
