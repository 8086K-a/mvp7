import { NextRequest, NextResponse } from "next/server"
import {
  confirmSubscriptionPayment,
  PaymentConfirmError,
} from "@/app/api/payment/lib/subscription-payment"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

export async function POST(req: NextRequest) {
  try {
    if (resolveDeploymentRegion() === "CN") {
      return NextResponse.json(
        { error: "CN deployment does not use Supabase confirm endpoint" },
        { status: 403 }
      )
    }

    const body = await req.json()

    const result = await confirmSubscriptionPayment({
      userId: body?.userId,
      userEmail: body?.userEmail,
      planId: body?.planId,
      billingCycle: body?.billingCycle,
      sessionId: body?.sessionId,
      token: body?.token,
      outTradeNo: body?.outTradeNo,
      tradeNo: body?.tradeNo,
      transactionId: body?.transactionId,
      paymentMethod: body?.paymentMethod,
      skipProviderVerification: body?.skipProviderVerification,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[payment/confirm] error:", error)

    if (error instanceof PaymentConfirmError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(
      { error: error?.message || "Failed to confirm payment" },
      { status: 500 }
    )
  }
}
