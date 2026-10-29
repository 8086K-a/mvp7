import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk"
import { createClient } from "@supabase/supabase-js"
import { MEMBERSHIP_PLANS, getCreditGrantByPlan, getPlanUsdPriceByRegion } from "@/lib/credits/pricing"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { createWechatNativeOrder } from "@/lib/utils/wechatpay-v3-lite"

const USD_TO_CNY_RATE = 1

let stripeInstance: Stripe | null = null
let supabaseInstance: any = null

function getStripe() {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY")
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-10-29.clover",
    })
  }

  return stripeInstance
}

function getSupabaseAdmin(): any {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return null
    }

    supabaseInstance = createClient(supabaseUrl, serviceRoleKey)
  }

  return supabaseInstance
}

function resolvePaymentMethod(method?: string) {
  const normalized = (method || "").toLowerCase()

  if (normalized === "card") return "stripe"
  if (normalized === "stripe") return "stripe"
  if (normalized === "paypal") return "paypal"
  if (normalized === "alipay") return "alipay"
  if (normalized === "wechat" || normalized === "wechatpay") return "wechatpay"

  return ""
}

function isPlaceholderValue(value?: string) {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true

  return (
    normalized.includes("your-") ||
    normalized.includes("your_") ||
    normalized.includes("your paypal") ||
    normalized.includes("placeholder")
  )
}

function normalizePemKey(raw?: string) {
  if (!raw) return ""

  const value = raw.trim().replace(/\\n/g, "\n")
  if (!value) return ""

  return value
}


function resolveAlipayGateway() {
  const sandboxFlag = String(process.env.ALIPAY_SANDBOX || "").toLowerCase() === "true"
  const explicitGateway = process.env.ALIPAY_GATEWAY || process.env.ALIPAY_GATEWAY_URL

  if (explicitGateway && explicitGateway.trim()) {
    return explicitGateway.trim()
  }

  if (sandboxFlag) {
    return "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
  }

  return "https://openapi.alipay.com/gateway.do"
}

function appendQueryParams(rawUrl: string, params: Record<string, string>) {
  try {
    const url = new URL(rawUrl)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return url.toString()
  } catch {
    return rawUrl
  }
}

async function recordPendingTransaction(payload: {
  userEmail: string
  planId: string
  billingCycle: "monthly" | "yearly"
  creditAmount: number
  amountUsd: number
  paymentMethod: string
  transactionId: string
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  const amountCny = Number((payload.amountUsd * USD_TO_CNY_RATE).toFixed(2))

  const { error } = await supabase.from("payment_transactions").insert({
    user_email: payload.userEmail,
    plan_type: payload.planId,
    billing_cycle: payload.billingCycle,
    credit_amount: payload.creditAmount,
    amount_usd: payload.amountUsd,
    amount_cny: payload.paymentMethod === "paypal" || payload.paymentMethod === "stripe" ? null : amountCny,
    payment_method: payload.paymentMethod,
    transaction_id: payload.transactionId,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error("[payment/create] failed to record pending transaction:", error)
  }
}

async function recordPendingChinaPayment(payload: {
  userId?: string
  userEmail: string
  planId: string
  billingCycle: "monthly" | "yearly"
  amountUsd: number
  paymentMethod: "alipay" | "wechatpay"
  transactionId: string
}) {
  try {
    const { getDatabase } = await import("@/lib/database/cloudbase-service")
    const db = await getDatabase()

    let resolvedUserId = String(payload.userId || "").trim()

    if (resolvedUserId) {
      const userById = await db.collection("web_users").where({ _id: resolvedUserId }).get()
      if ((userById?.data?.length || 0) === 0) {
        resolvedUserId = ""
      }
    }

    if (!resolvedUserId) {
      const userResult = await db.collection("web_users").where({ email: payload.userEmail }).get()
      resolvedUserId = userResult?.data?.[0]?._id || ""
    }

    const amountCny = Number((payload.amountUsd * USD_TO_CNY_RATE).toFixed(2))
    const now = new Date().toISOString()

    const paymentDoc = {
      user_id: resolvedUserId || null,
      user_email: payload.userEmail,
      plan_type: payload.planId,
      billing_cycle: payload.billingCycle,
      amount_usd: payload.amountUsd,
      amount_cny: amountCny,
      payment_method: payload.paymentMethod === "wechatpay" ? "wechat" : "alipay",
      out_trade_no: payload.transactionId,
      status: "pending",
      metadata: {
        planId: payload.planId,
        billingCycle: payload.billingCycle,
        userEmail: payload.userEmail,
      },
      created_at: now,
      updated_at: now,
    }

    try {
      await db.collection("payments").add(paymentDoc)
    } catch (error: any) {
      const message = String(error?.message || "")
      const code = String(error?.code || "")
      const isMissingCollection =
        message.includes("Db or Table not exist") ||
        message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
        code.includes("DATABASE_COLLECTION_NOT_EXIST")

      if (!isMissingCollection) {
        throw error
      }

      await db.createCollection("payments")
      await db.collection("payments").add(paymentDoc)
    }
  } catch (error) {
    console.error("[payment/create] failed to record CN pending payment:", error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      paymentMethod,
      method,
      planId,
      billingCycle,
      userId,
      userEmail,
      returnUrl,
      cancelUrl,
    } = body as {
      paymentMethod?: string
      method?: string
      planId?: string
      billingCycle?: "monthly" | "yearly"
      userId?: string
      userEmail?: string
      returnUrl?: string
      cancelUrl?: string
    }

    const finalMethod = resolvePaymentMethod(paymentMethod || method)
    const finalCycle = billingCycle === "yearly" ? "yearly" : "monthly"

    if (!finalMethod || !planId || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields: paymentMethod, planId, userEmail" },
        { status: 400 }
      )
    }

    const deploymentRegion = resolveDeploymentRegion()
    const isChinaDeployment = deploymentRegion === "CN"

    if (isChinaDeployment && !["alipay", "wechatpay"].includes(finalMethod)) {
      return NextResponse.json(
        { error: "CN deployment only supports Alipay/WeChat Pay" },
        { status: 400 }
      )
    }

    if (!isChinaDeployment && !["stripe", "paypal"].includes(finalMethod)) {
      return NextResponse.json(
        { error: "INTL deployment only supports Stripe/PayPal" },
        { status: 400 }
      )
    }

    const plan = MEMBERSHIP_PLANS.find((item) => item.id === planId)
    if (!plan) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 })
    }

    const amountUsd = getPlanUsdPriceByRegion(plan, finalCycle, deploymentRegion)
    const creditAmount = getCreditGrantByPlan(plan, finalCycle)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const successUrl = appendQueryParams(
      returnUrl || `${siteUrl}/payment/success`,
      { planId: plan.id, cycle: finalCycle }
    )
    const failUrl = appendQueryParams(
      cancelUrl || `${siteUrl}/payment/cancel`,
      { planId: plan.id, cycle: finalCycle }
    )

    if (finalMethod === "stripe") {
      const stripe = getStripe()
      const stripeSuccessTemplateUrl = new URL(successUrl)
      const stripeSessionPlaceholder = "CHECKOUT_SESSION_ID_PLACEHOLDER"
      stripeSuccessTemplateUrl.searchParams.set("session_id", stripeSessionPlaceholder)
      const stripeSuccessUrl = stripeSuccessTemplateUrl
        .toString()
        .replace(stripeSessionPlaceholder, "{CHECKOUT_SESSION_ID}")
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.name} Credits (${finalCycle})`,
                description: `${creditAmount} credits package`,
              },
              unit_amount: Math.round(amountUsd * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: stripeSuccessUrl,
        cancel_url: failUrl,
        customer_email: userEmail,
        metadata: {
        planId: plan.id,
        billingCycle: finalCycle,
        creditAmount: String(creditAmount),
        userEmail,
        paymentType: "credits",
      },
      })

      await recordPendingTransaction({
        userEmail,
        planId: plan.id,
        billingCycle: finalCycle,
        creditAmount,
        amountUsd,
        paymentMethod: "stripe",
        transactionId: session.id,
      })

      return NextResponse.json({
        success: true,
        paymentMethod: "stripe",
        sessionId: session.id,
        paymentUrl: session.url,
      })
    }

    if (finalMethod === "paypal") {
      const paypalClientId =
        process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
      const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET

      if (isPlaceholderValue(paypalClientId) || isPlaceholderValue(paypalClientSecret)) {
        return NextResponse.json(
          {
            error:
              "PayPal is not configured. Please set valid PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET for sandbox/production.",
          },
          { status: 503 }
        )
      }

      const safePaypalClientId = paypalClientId!
      const safePaypalClientSecret = paypalClientSecret!

      const client = new Client({
        clientCredentialsAuthCredentials: {
          oAuthClientId: safePaypalClientId,
          oAuthClientSecret: safePaypalClientSecret,
        },
        environment:
          process.env.PAYPAL_MODE === "production"
            ? Environment.Production
            : Environment.Sandbox,
      })

      const ordersController = new OrdersController(client)

      const response = await ordersController.createOrder({
        body: {
          intent: "CAPTURE" as any,
          purchaseUnits: [
            {
              amount: {
                currencyCode: "USD",
                value: amountUsd.toFixed(2),
              },
              description: `${creditAmount} credits package`,
            },
          ],
          applicationContext: {
            returnUrl: successUrl,
            cancelUrl: failUrl,
            userAction: "PAY_NOW" as any,
          },
        },
      } as any)

      const order = (response as any).result
      const approvalUrl = order?.links?.find((item: any) => item.rel === "approve")?.href

      if (!approvalUrl || !order?.id) {
        return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 })
      }

      await recordPendingTransaction({
        userEmail,
        planId: plan.id,
        billingCycle: finalCycle,
        creditAmount,
        amountUsd,
        paymentMethod: "paypal",
        transactionId: order.id,
      })

      return NextResponse.json({
        success: true,
        paymentMethod: "paypal",
        orderId: order.id,
        paymentUrl: approvalUrl,
      })
    }

    if (finalMethod === "alipay") {
      const appId = process.env.ALIPAY_APP_ID
      const rawPrivateKey = process.env.ALIPAY_PRIVATE_KEY
      const rawAlipayPublicKey = process.env.ALIPAY_ALIPAY_PUBLIC_KEY || process.env.ALIPAY_PUBLIC_KEY
      const gateway = resolveAlipayGateway()

      if (!appId || !rawPrivateKey || !rawAlipayPublicKey) {
        return NextResponse.json({ error: "Alipay is not configured" }, { status: 500 })
      }

      if (
        isPlaceholderValue(appId) ||
        isPlaceholderValue(rawPrivateKey) ||
        isPlaceholderValue(rawAlipayPublicKey)
      ) {
        return NextResponse.json({ error: "Alipay credentials are placeholders" }, { status: 500 })
      }

      const privateKey = normalizePemKey(rawPrivateKey)
      const alipayPublicKey = normalizePemKey(rawAlipayPublicKey)

      const { AlipaySdk } = await import("alipay-sdk")
      const sdk = new AlipaySdk({
        appId,
        privateKey,
        alipayPublicKey,
        gateway,
      })

      const outTradeNo = `ALIPAY_${plan.id.toUpperCase()}_${Date.now()}`
      const amountCny = (amountUsd * USD_TO_CNY_RATE).toFixed(2)

      const alipayReturnUrl = appendQueryParams(`${siteUrl}/payment/success`, {
        planId: plan.id,
        cycle: finalCycle,
      })

      const alipayNotifyUrl = `${siteUrl}/api/payment/webhook/alipay`

      const paymentUrlRaw = await (sdk as any).pageExec(
        "alipay.trade.page.pay",
        "GET",
        {
          bizContent: {
            out_trade_no: outTradeNo,
            product_code: "FAST_INSTANT_TRADE_PAY",
            total_amount: amountCny,
            subject: `${plan.name} Credits (${finalCycle})`,
            body: `${plan.id}-${finalCycle}-${userEmail}`,
          },
          returnUrl: alipayReturnUrl,
          notifyUrl: alipayNotifyUrl,
        }
      )

      const paymentRawString =
        typeof paymentUrlRaw === "string"
          ? paymentUrlRaw
          : String((paymentUrlRaw as any)?.url || (paymentUrlRaw as any)?.href || "")

      const paymentUrlCandidate = paymentRawString.trim()
      const isHtmlForm = /<form[\s\S]*<\/form>/i.test(paymentUrlCandidate)

      const paymentUrl =
        paymentUrlCandidate && /^https?:\/\//i.test(paymentUrlCandidate)
          ? paymentUrlCandidate
          : !isHtmlForm && paymentUrlCandidate
            ? `${gateway}${paymentUrlCandidate.startsWith("?") ? "" : "?"}${paymentUrlCandidate.replace(/^\?/, "")}`
            : ""

      if (!paymentUrl && !isHtmlForm) {
        return NextResponse.json({ error: "Alipay payment URL not generated" }, { status: 500 })
      }

      await recordPendingChinaPayment({
        userId,
        userEmail,
        planId: plan.id,
        billingCycle: finalCycle,
        amountUsd,
        paymentMethod: "alipay",
        transactionId: outTradeNo,
      })

      return NextResponse.json({
        success: true,
        paymentMethod: "alipay",
        orderId: outTradeNo,
        paymentUrl: paymentUrl || undefined,
        paymentFormHtml: isHtmlForm ? paymentUrlCandidate : undefined,
      })
    }

    if (finalMethod === "wechatpay") {
      const outTradeNo = `WC${Date.now()}${Math.random().toString(36).slice(2, 10)}`
      const amountInCents = Math.round(amountUsd * USD_TO_CNY_RATE * 100)

      const response = await createWechatNativeOrder({
        description: `${plan.name} Credits (${finalCycle})`,
        outTradeNo,
        notifyUrl: `${siteUrl}/api/payment/webhook/wechat`,
        amountInCents,
      })

      await recordPendingChinaPayment({
        userId,
        userEmail,
        planId: plan.id,
        billingCycle: finalCycle,
        amountUsd,
        paymentMethod: "wechatpay",
        transactionId: outTradeNo,
      })

      return NextResponse.json({
        success: true,
        paymentMethod: "wechatpay",
        orderId: outTradeNo,
        qrCodeUrl: response?.code_url,
        prepayId: response?.prepay_id,
      })
    }

    return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 })
  } catch (error: any) {
    console.error("[payment/create] error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create payment" },
      { status: 500 }
    )
  }
}
