import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
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

function parseWechatWebhookPayload(rawBody: string): any {
  const data = JSON.parse(rawBody)

  if (data?.resource?.ciphertext && data?.resource?.nonce) {
    const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || ""
    if (!apiV3Key) {
      throw new Error("WECHAT_PAY_API_V3_KEY is missing")
    }

    const nonce = Buffer.from(String(data.resource.nonce), "utf8")
    const associatedData = Buffer.from(String(data.resource.associated_data || ""), "utf8")
    const ciphertext = Buffer.from(String(data.resource.ciphertext), "base64")

    if (ciphertext.length < 17) {
      throw new Error("Invalid WeChat ciphertext")
    }

    const authTag = ciphertext.subarray(ciphertext.length - 16)
    const encrypted = ciphertext.subarray(0, ciphertext.length - 16)

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(apiV3Key, "utf8"),
      nonce
    )
    decipher.setAAD(associatedData)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
    const resourceData = JSON.parse(decrypted)

    return {
      ...data,
      resource: resourceData,
    }
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    if (resolveDeploymentRegion() !== "CN") {
      return NextResponse.json(
        { code: "FAIL", message: "WeChat webhook only available in CN" },
        { status: 403 }
      )
    }

    const rawBody = await request.text()
    const payload = parseWechatWebhookPayload(rawBody)

    const eventType = payload?.event_type || payload?.eventType
    if (eventType !== "TRANSACTION.SUCCESS") {
      return NextResponse.json({ code: "SUCCESS", message: "Ok" }, { status: 200 })
    }

    const paymentData = payload?.resource || payload
    const outTradeNo = paymentData?.out_trade_no
    const transactionId = paymentData?.transaction_id
    const tradeState = paymentData?.trade_state || "SUCCESS"

    if (!outTradeNo || !transactionId || tradeState !== "SUCCESS") {
      return NextResponse.json(
        { code: "FAIL", message: "Invalid WeChat payment payload" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    await ensureCloudbaseCollection(db, "webhook_events")

    const webhookEventId = `wechat_${transactionId}`

    const existingEvent = await db.collection("webhook_events").where({ id: webhookEventId }).get()
    if ((existingEvent?.data?.length || 0) > 0) {
      return NextResponse.json({ code: "SUCCESS", message: "Ok" }, { status: 200 })
    }

    await db.collection("webhook_events").add({
      id: webhookEventId,
      provider: "wechat",
      event_type: "TRANSACTION.SUCCESS",
      event_data: paymentData,
      processed: false,
      created_at: new Date().toISOString(),
    })

    await db.collection("payments").where({ out_trade_no: outTradeNo }).update({
      status: "completed",
      transaction_id: transactionId,
      webhook_confirmed: true,
      updated_at: new Date().toISOString(),
    })

    const paymentResult = await db.collection("payments").where({ out_trade_no: outTradeNo }).get()
    const paymentRecord = paymentResult?.data?.[0]

    const applyResult = await applyCnPaymentCredits({
      db,
      paymentRecord,
      referenceId: `wechat_${transactionId}`,
    })

    if (!applyResult.success) {
      await db.collection("webhook_events").where({ id: webhookEventId }).update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: applyResult.error || "failed to apply credits",
      })

      return NextResponse.json(
        { code: "FAIL", message: applyResult.error || "Credits apply failed" },
        { status: 500 }
      )
    }

    console.info("[wechat/webhook] apply credits result:", {
      outTradeNo,
      transactionId,
      userEmail: applyResult.userEmail,
      planId: applyResult.planId,
      billingCycle: applyResult.billingCycle,
      creditsToAdd: applyResult.creditsToAdd,
      success: applyResult.success,
      alreadyProcessed: applyResult.alreadyProcessed,
      error: applyResult.error,
    })

    await db.collection("webhook_events").where({ id: webhookEventId }).update({
      processed: true,
      processed_at: new Date().toISOString(),
    })

    return NextResponse.json({ code: "SUCCESS", message: "Ok" }, { status: 200 })
  } catch (error: any) {
    console.error("[wechat/webhook] error:", error)
    return NextResponse.json(
      { code: "FAIL", message: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
