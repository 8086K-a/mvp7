import { NextRequest, NextResponse } from "next/server"
import * as crypto from "crypto"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { applyCnPaymentCredits } from "@/app/api/payment/lib/cn-payment-credits"

export const runtime = "nodejs"

async function ensureCloudbaseCollection(db: any, collectionName: string) {
  try {
    await db.collection(collectionName).limit(1).get()
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

    await db.createCollection(collectionName)
  }
}

function verifyAlipaySignature(
  params: Record<string, string>,
  publicKey?: string
): boolean {
  try {
    if (process.env.NODE_ENV === "development") {
      return true
    }

    if (!publicKey) {
      return false
    }

    const sign = params.sign
    const signType = params.sign_type

    if (!sign || signType !== "RSA2") {
      return false
    }

    const paramsToSign = { ...params }
    delete paramsToSign.sign
    delete paramsToSign.sign_type

    const sortedKeys = Object.keys(paramsToSign).sort()
    const signString = sortedKeys.map((key) => `${key}=${paramsToSign[key]}`).join("&")

    const verify = crypto.createVerify("RSA-SHA256")
    verify.update(signString, "utf8")

    const normalizedKey = publicKey.includes("BEGIN PUBLIC KEY")
      ? publicKey
      : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`

    return verify.verify(normalizedKey, sign, "base64")
  } catch {
    return false
  }
}

async function processAlipayPayment(params: Record<string, string>) {
  try {
    console.info("[alipay/webhook] incoming params:", {
      out_trade_no: params.out_trade_no,
      trade_no: params.trade_no,
      trade_status: params.trade_status,
      method: params.method,
      sign_type: params.sign_type,
    })

    if (resolveDeploymentRegion() !== "CN") {
      return new NextResponse("failure", { status: 403 })
    }

    const tradeStatus = params.trade_status
    const outTradeNo = params.out_trade_no
    const tradeNo = params.trade_no

    const isValid = verifyAlipaySignature(
      params,
      process.env.ALIPAY_PUBLIC_KEY || process.env.ALIPAY_ALIPAY_PUBLIC_KEY
    )

    if (!isValid) {
      return new NextResponse("failure")
    }

    if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
      return new NextResponse("success")
    }

    if (!outTradeNo) {
      return new NextResponse("failure")
    }

    const db = await getDatabase()
    let webhookEventsReady = true
    try {
      await ensureCloudbaseCollection(db, "webhook_events")
    } catch (error) {
      webhookEventsReady = false
      console.warn("[alipay/webhook] webhook_events unavailable, continue without event log", error)
    }

    const webhookEventId = `alipay_${outTradeNo}_${tradeNo || "unknown"}`

    if (webhookEventsReady) {
      const existingEvent = await db.collection("webhook_events").where({ id: webhookEventId }).get()
      if ((existingEvent?.data?.length || 0) > 0) {
        return new NextResponse("success")
      }
    }

    if (webhookEventsReady) {
      await db.collection("webhook_events").add({
        id: webhookEventId,
        provider: "alipay",
        event_type: tradeStatus,
        event_data: params,
        processed: false,
        created_at: new Date().toISOString(),
      })
    }

    const paymentResult = await db
      .collection("payments")
      .where({ out_trade_no: outTradeNo })
      .get()

    const paymentRecord = paymentResult?.data?.[0]

    if (!paymentRecord) {
      if (webhookEventsReady) {
        await db.collection("webhook_events").where({ id: webhookEventId }).update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: "payment record not found",
        })
      }
      return new NextResponse("failure")
    }

    await db.collection("payments").where({ out_trade_no: outTradeNo }).update({
      status: "completed",
      transaction_id: tradeNo || paymentRecord.transaction_id,
      updated_at: new Date().toISOString(),
    })

    const applyResult = await applyCnPaymentCredits({
      db,
      paymentRecord,
      referenceId: `alipay_${tradeNo || outTradeNo}`,
    })

    if (!applyResult.success) {
      if (webhookEventsReady) {
        await db.collection("webhook_events").where({ id: webhookEventId }).update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: applyResult.error || "failed to apply credits",
        })
      }
      return new NextResponse("failure")
    }

    console.info("[alipay/webhook] apply credits result:", {
      outTradeNo,
      tradeNo,
      userEmail: applyResult.userEmail,
      planId: applyResult.planId,
      billingCycle: applyResult.billingCycle,
      creditsToAdd: applyResult.creditsToAdd,
      success: applyResult.success,
      alreadyProcessed: applyResult.alreadyProcessed,
      error: applyResult.error,
    })

    try {
      const verifyPayment = await db.collection("payments").where({ out_trade_no: outTradeNo }).get()
      const verifyRecord = verifyPayment?.data?.[0]
      const verifyUsers = await db.collection("web_users").where({ email: applyResult.userEmail }).get()
      const verifyUser = verifyUsers?.data?.[0]

      console.info("[alipay/webhook] post-apply verify:", {
        outTradeNo,
        creditsApplied: Boolean(verifyRecord?.credits_applied),
        userEmail: applyResult.userEmail,
        userCredits: verifyUser?.credits,
      })
    } catch (verifyError) {
      console.error("[alipay/webhook] post-apply verify failed:", verifyError)
    }

    if (webhookEventsReady) {
      await db.collection("webhook_events").where({ id: webhookEventId }).update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
    }

    return new NextResponse("success")
  } catch (error) {
    console.error("[alipay/webhook] error:", error)
    return new NextResponse("failure")
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const params: Record<string, string> = {}

  formData.forEach((value, key) => {
    params[key] = String(value)
  })

  return processAlipayPayment(params)
}

export async function GET(request: NextRequest) {
  const params: Record<string, string> = {}

  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return processAlipayPayment(params)
}
