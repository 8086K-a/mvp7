import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { createWechatNativeOrder } from "@/lib/utils/wechatpay-v3-lite"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      userEmail,
      amount,
      description,
      currency = "CNY",
      planId,
      billingCycle,
    } = body as {
      userId?: string
      userEmail?: string
      amount?: number
      description?: string
      currency?: string
      planId?: string
      billingCycle?: "monthly" | "yearly"
    }

    if (!userEmail || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: userEmail, amount" },
        { status: 400 }
      )
    }

    if (currency !== "CNY") {
      return NextResponse.json(
        { success: false, error: "Only CNY currency is supported for WeChat Native payment" },
        { status: 400 }
      )
    }

    const outTradeNo = `WX${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const amountInCents = Math.round(amount * 100)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

    const response = await createWechatNativeOrder({
      description: description || "Membership Payment",
      outTradeNo,
      notifyUrl: `${siteUrl}/api/payment/webhook/wechat`,
      amountInCents,
    })

    const db = await getDatabase()
    await db.collection("payments").add({
      out_trade_no: outTradeNo,
      user_id: userId || null,
      user_email: userEmail,
      plan_type: planId || null,
      billing_cycle: billingCycle || "monthly",
      amount,
      currency,
      payment_method: "wechat",
      status: "pending",
      code_url: response?.code_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        source: "wechat_native_create_api",
      },
    })

    return NextResponse.json({
      success: true,
      out_trade_no: outTradeNo,
      code_url: response?.code_url,
      amount,
      currency,
      expires_in: 7200,
    })
  } catch (error: any) {
    console.error("[wechat/native/create] error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
