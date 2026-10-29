import Stripe from "stripe"
import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk"
import { createClient } from "@supabase/supabase-js"
import { MEMBERSHIP_PLANS, getCreditGrantByPlan, getPlanUsdPriceByRegion } from "@/lib/credits/pricing"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

export type SupportedPaymentMethod = "stripe" | "paypal" | "alipay" | "wechatpay"

export interface ConfirmSubscriptionPaymentInput {
  userId?: string
  userEmail?: string
  planId?: string
  billingCycle?: "monthly" | "yearly"
  sessionId?: string
  token?: string
  outTradeNo?: string
  tradeNo?: string
  transactionId?: string
  paymentMethod?: SupportedPaymentMethod
  skipProviderVerification?: boolean
}

export interface ConfirmSubscriptionPaymentResult {
  success: true
  alreadyProcessed?: boolean
  transactionId: string
  newExpireAt: string | null
  newCredits: number
  subscriptionTier: string | null
}

export class PaymentConfirmError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

let stripeInstance: Stripe | null = null
let supabaseInstance: any = null

function getSupabaseAdmin(): any {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!url || !key) {
      throw new PaymentConfirmError("Supabase admin config missing", 500)
    }

    supabaseInstance = createClient(url, key)
  }

  return supabaseInstance
}

function getStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new PaymentConfirmError("Missing STRIPE_SECRET_KEY", 500)
    }

    stripeInstance = new Stripe(key, {
      apiVersion: "2025-10-29.clover",
    })
  }

  return stripeInstance
}

function normalizeCycle(cycle?: string | null): "monthly" | "yearly" {
  return cycle === "yearly" ? "yearly" : "monthly"
}

function resolveMethod(input: ConfirmSubscriptionPaymentInput): SupportedPaymentMethod {
  if (input.paymentMethod) return input.paymentMethod
  if (input.sessionId) return "stripe"
  if (input.token) return "paypal"
  if (input.outTradeNo || input.tradeNo) return "alipay"
  return "stripe"
}

function isPlaceholderId(value?: string | null): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false

  if (/^\{[A-Z0-9_]+\}$/.test(trimmed)) return true
  if (trimmed.includes("CHECKOUT_SESSION_ID")) return true

  return false
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

function isUuid(value?: string | null) {
  const id = String(value || "").trim()
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

async function capturePayPalOrder(orderId: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new PaymentConfirmError("PayPal config missing", 500)
  }

  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId,
      oAuthClientSecret: clientSecret,
    },
    environment:
      process.env.PAYPAL_MODE === "production"
        ? Environment.Production
        : Environment.Sandbox,
  })

  const orders = new OrdersController(client)
  let order: any = null

  try {
    const result = await orders.captureOrder({ id: orderId, body: {} } as any)
    order = (result as any).result || (result as any).body
  } catch (error: any) {
    const message = String(error?.message || "")
    const body = String(error?.body || "")
    const statusCode = Number(error?.statusCode || 0)
    const alreadyCaptured =
      message.includes("ORDER_ALREADY_CAPTURED") ||
      body.includes("ORDER_ALREADY_CAPTURED") ||
      statusCode === 422

    if (!alreadyCaptured) {
      throw error
    }

    const detail = await orders.getOrder({ id: orderId } as any)
    order = (detail as any).result || (detail as any).body
  }

  const status = (order?.status || "").toUpperCase()
  if (status !== "COMPLETED") {
    throw new PaymentConfirmError(`PayPal order not completed: ${status || "unknown"}`, 400)
  }

  return order
}

async function upsertWebPaymentTransaction(options: {
  supabase: any
  userEmail: string
  planId: string
  cycle: "monthly" | "yearly"
  paymentMethod: SupportedPaymentMethod
  transactionId: string
  amountUsd: number
}) {
  const grossAmount = Math.round(options.amountUsd * 100)

  const payload: any = {
    user_email: options.userEmail,
    plan_type: options.planId,
    billing_cycle: options.cycle,
    payment_method: options.paymentMethod,
    payment_status: "completed",
    transaction_type: "purchase",
    gross_amount: grossAmount,
    net_amount: grossAmount,
    transaction_id: options.transactionId,
    payment_time: new Date().toISOString(),
    metadata: {
      source: "payment_confirm_api",
      planId: options.planId,
      cycle: options.cycle,
    },
    updated_at: new Date().toISOString(),
  }

  if (options.paymentMethod === "stripe") {
    payload.stripe_session_id = options.transactionId
  }

  if (options.paymentMethod === "paypal") {
    payload.paypal_order_id = options.transactionId
  }

  const { error } = await options.supabase
    .from("web_payment_transactions")
    .upsert(payload, { onConflict: "transaction_id" })

  if (error) {
    throw new PaymentConfirmError(error.message, 500)
  }
}

async function fetchUserSummaryByEmail(supabase: any, userEmail: string) {
  const { data } = await supabase
    .from("user")
    .select("id, credits")
    .ilike("email", normalizeEmail(userEmail))
    .maybeSingle()

  return data
}

export async function confirmSubscriptionPayment(
  input: ConfirmSubscriptionPaymentInput
): Promise<ConfirmSubscriptionPaymentResult> {
  if (resolveDeploymentRegion() !== "INTL") {
    throw new PaymentConfirmError("Supabase payment confirmation is only available in INTL", 403)
  }

  const supabase = getSupabaseAdmin()

  const method = resolveMethod(input)
  let transactionId =
    input.transactionId ||
    input.sessionId ||
    input.token ||
    input.outTradeNo ||
    input.tradeNo ||
    ""

  if (
    isPlaceholderId(input.sessionId) ||
    isPlaceholderId(input.transactionId) ||
    isPlaceholderId(transactionId)
  ) {
    throw new PaymentConfirmError(
      "Invalid Stripe session id placeholder received. Please return from Stripe checkout page and retry.",
      400
    )
  }

  if (!transactionId) {
    throw new PaymentConfirmError("No transaction identifier", 400)
  }

  let stripeCustomerEmail = ""

  if (!input.skipProviderVerification) {
    if (method === "stripe") {
      const sessionId = input.sessionId || transactionId
      const session = await getStripe().checkout.sessions.retrieve(sessionId)

      if (session.payment_status !== "paid") {
        throw new PaymentConfirmError(`Stripe session not paid: ${session.payment_status}`, 400)
      }

      stripeCustomerEmail = normalizeEmail(
        session.customer_details?.email || session.customer_email || session.customer?.toString()
      )
      transactionId = session.id
    }

    if (method === "paypal") {
      const token = input.token || transactionId
      await capturePayPalOrder(token)
      transactionId = token
    }
  }

  const { data: existingTx, error: txLoadError } = await supabase
    .from("payment_transactions")
    .select("id, status, payment_method, user_email, plan_type, billing_cycle")
    .eq("transaction_id", transactionId)
    .maybeSingle()

  if (txLoadError) {
    throw new PaymentConfirmError(txLoadError.message, 500)
  }

  const resolvedUserEmail =
    normalizeEmail(input.userEmail) || normalizeEmail(existingTx?.user_email) || stripeCustomerEmail
  const resolvedPlanId = input.planId || existingTx?.plan_type || ""
  const cycle = normalizeCycle(input.billingCycle || existingTx?.billing_cycle)
  const paymentMethod = (existingTx?.payment_method || method) as SupportedPaymentMethod

  if (!resolvedUserEmail || !resolvedPlanId) {
    throw new PaymentConfirmError("Missing required fields: userEmail, planId", 400)
  }

  const plan = MEMBERSHIP_PLANS.find((item) => item.id === resolvedPlanId)
  if (!plan) {
    throw new PaymentConfirmError("Invalid planId", 400)
  }

  const deploymentRegion = resolveDeploymentRegion()
  const amountUsd = getPlanUsdPriceByRegion(plan, cycle, deploymentRegion)

  if (existingTx?.status === "completed") {
    await upsertWebPaymentTransaction({
      supabase,
      userEmail: resolvedUserEmail,
      planId: resolvedPlanId,
      cycle,
      paymentMethod,
      transactionId,
      amountUsd,
    })

    const existingUser = await fetchUserSummaryByEmail(supabase, resolvedUserEmail)

    return {
      success: true,
      alreadyProcessed: true,
      transactionId,
      newExpireAt: null,
      newCredits: Number(existingUser?.credits ?? 0),
      subscriptionTier: null,
    }
  }

  let shouldApplyBenefits = false

  if (existingTx?.id) {
    const { data: transitionedTx, error: updateTxError } = await supabase
      .from("payment_transactions")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTx.id)
      .neq("status", "completed")
      .select("id")
      .maybeSingle()

    if (updateTxError) {
      throw new PaymentConfirmError(updateTxError.message, 500)
    }

    shouldApplyBenefits = Boolean(transitionedTx?.id)
  } else {
    const { error: insertTxError } = await supabase.from("payment_transactions").insert({
      user_email: normalizeEmail(resolvedUserEmail),
      plan_type: resolvedPlanId,
      billing_cycle: cycle,
      credit_amount: getCreditGrantByPlan(plan, cycle),
      amount_usd: amountUsd,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      status: "completed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertTxError) {
      if (insertTxError.code === "23505") {
        shouldApplyBenefits = false
      } else {
        throw new PaymentConfirmError(insertTxError.message, 500)
      }
    } else {
      shouldApplyBenefits = true
    }
  }

  await upsertWebPaymentTransaction({
    supabase,
    userEmail: resolvedUserEmail,
    planId: resolvedPlanId,
    cycle,
    paymentMethod,
    transactionId,
    amountUsd,
  })

  if (!shouldApplyBenefits) {
    const existingUser = await fetchUserSummaryByEmail(supabase, resolvedUserEmail)

    return {
      success: true,
      alreadyProcessed: true,
      transactionId,
      newExpireAt: null,
      newCredits: Number(existingUser?.credits ?? 0),
      subscriptionTier: null,
    }
  }

  let resolvedUserId = isUuid(input.userId) ? String(input.userId).trim() : ""

  if (!resolvedUserId) {
    const { data: byEmail } = await supabase
      .from("user")
      .select("id")
      .ilike("email", resolvedUserEmail)
      .maybeSingle()

    resolvedUserId = byEmail?.id || ""
  }

  if (!resolvedUserId && isUuid(input.userId)) {
    const candidateUserId = String(input.userId).trim()
    const now = new Date().toISOString()
    const { error: createUserError } = await supabase.from("user").insert({
      id: candidateUserId,
      email: resolvedUserEmail,
      full_name: resolvedUserEmail.split("@")[0],
      credits: 0,
      subscription_tier: "free",
      created_at: now,
      updated_at: now,
    })

    if (createUserError && createUserError.code !== "23505") {
      throw new PaymentConfirmError(createUserError.message, 500)
    }

    const { data: createdByEmail } = await supabase
      .from("user")
      .select("id")
      .ilike("email", resolvedUserEmail)
      .maybeSingle()

    resolvedUserId = createdByEmail?.id || candidateUserId
  }

  if (!resolvedUserId) {
    throw new PaymentConfirmError(`User not found: ${resolvedUserEmail}`, 404)
  }

  const { data: userRow, error: userLoadError } = await supabase
    .from("user")
    .select("id, credits")
    .eq("id", resolvedUserId)
    .maybeSingle()

  if (userLoadError || !userRow?.id) {
    throw new PaymentConfirmError(userLoadError?.message || "User not found", 404)
  }

  const currentCredits = Number(userRow?.credits ?? 0)
  const safeCredits = Number.isFinite(currentCredits) ? currentCredits : 0
  const grantCredits = getCreditGrantByPlan(plan, cycle)
  const newCredits = safeCredits + grantCredits

  const { error: userUpdateError } = await supabase
    .from("user")
    .update({
      credits: newCredits,
    })
    .eq("id", resolvedUserId)

  if (userUpdateError) {
    throw new PaymentConfirmError(userUpdateError.message, 500)
  }

  return {
    success: true,
    transactionId,
    newExpireAt: null,
    newCredits,
    subscriptionTier: null,
  }
}
