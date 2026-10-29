import { NextRequest, NextResponse } from "next/server"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { queryWechatOrderByOutTradeNo } from "@/lib/utils/wechatpay-v3-lite"
import { applyCnPaymentCredits } from "@/app/api/payment/lib/cn-payment-credits"

export const runtime = "nodejs"

function mapTradeStateToStatus(tradeState?: string): "pending" | "completed" | "failed" | "refunded" | "unknown" {
  const state = String(tradeState || "").toUpperCase()
  if (state === "SUCCESS") return "completed"
  if (state === "REFUND") return "refunded"
  if (["CLOSED", "REVOKED", "PAYERROR"].includes(state)) return "failed"
  if (["NOTPAY", "USERPAYING"].includes(state)) return "pending"
  return "unknown"
}

function normalizePemKey(raw?: string) {
  if (!raw) return ""
  const value = raw.trim().replace(/\\n/g, "\n")
  return value || ""
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

async function queryAlipayTrade(outTradeNo: string) {
  const appId = process.env.ALIPAY_APP_ID
  const rawPrivateKey = process.env.ALIPAY_PRIVATE_KEY
  const rawAlipayPublicKey = process.env.ALIPAY_ALIPAY_PUBLIC_KEY || process.env.ALIPAY_PUBLIC_KEY

  if (!appId || !rawPrivateKey || !rawAlipayPublicKey) {
    throw new Error("Alipay config missing")
  }

  const privateKey = normalizePemKey(rawPrivateKey)
  const alipayPublicKey = normalizePemKey(rawAlipayPublicKey)
  const gateway = resolveAlipayGateway()

  const { AlipaySdk } = await import("alipay-sdk")
  const sdk = new AlipaySdk({
    appId,
    privateKey,
    alipayPublicKey,
    gateway,
  })

  const result = await (sdk as any).exec("alipay.trade.query", {
    bizContent: { out_trade_no: outTradeNo },
  })

  const body =
    result?.alipay_trade_query_response ||
    result?.response ||
    result ||
    {}

  return body
}

export async function GET(request: NextRequest) {
  try {
    const paymentId = request.nextUrl.searchParams.get("paymentId")
    const requestedMethodRaw = String(request.nextUrl.searchParams.get("method") || "").toLowerCase()
    const requestedMethod =
      requestedMethodRaw === "wechatpay"
        ? "wechat"
        : requestedMethodRaw === "alipay"
          ? "alipay"
          : requestedMethodRaw
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "paymentId is required", status: "unknown" },
        { status: 400 }
      )
    }

    if (resolveDeploymentRegion() !== "CN") {
      return NextResponse.json(
        { success: false, error: "Status API only available in CN", status: "unknown" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const paymentResult = await db.collection("payments").where({ out_trade_no: paymentId }).get()
    const paymentRecord = paymentResult?.data?.[0]

    if (!paymentRecord) {
      return NextResponse.json(
        { success: false, error: "Payment record not found", status: "unknown" },
        { status: 404 }
      )
    }

    const localStatus = String(paymentRecord?.status || "pending")
    let finalStatus: "pending" | "completed" | "failed" | "refunded" | "unknown" =
      localStatus === "completed"
        ? "completed"
        : localStatus === "failed"
          ? "failed"
          : localStatus === "refunded"
            ? "refunded"
            : "pending"

    let tradeState: string | null = null
    let transactionId: string | null = paymentRecord?.transaction_id || null

    const persistedMethodRaw = String(paymentRecord?.payment_method || "").toLowerCase()
    const persistedMethod =
      persistedMethodRaw === "wechatpay"
        ? "wechat"
        : persistedMethodRaw === "alipay"
          ? "alipay"
          : persistedMethodRaw

    const method = requestedMethod || persistedMethod

    console.info("[payment/status] method resolved:", {
      paymentId,
      requestedMethodRaw,
      requestedMethod,
      persistedMethodRaw,
      persistedMethod,
      finalMethod: method,
      localStatus,
    })

    if (method === "wechat") {
      try {
        const wechatResp: any = await queryWechatOrderByOutTradeNo(paymentId)
        tradeState = wechatResp?.trade_state || null
        transactionId = wechatResp?.transaction_id || transactionId

        const remoteStatus = mapTradeStateToStatus(tradeState || undefined)
        if (remoteStatus !== "unknown") {
          finalStatus = remoteStatus
        }

        if (finalStatus === "completed" && localStatus !== "completed") {
          await db.collection("payments").where({ out_trade_no: paymentId }).update({
            status: "completed",
            transaction_id: transactionId,
            updated_at: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error("[payment/status] wechat query failed, fallback local status:", error)
      }
    }

    if (method === "alipay" && finalStatus !== "completed") {
      try {
        const alipayTrade = await queryAlipayTrade(paymentId)
        const alipayStatus = String(alipayTrade?.trade_status || "").toUpperCase()

        if (alipayStatus === "TRADE_SUCCESS" || alipayStatus === "TRADE_FINISHED") {
          finalStatus = "completed"
          transactionId = String(alipayTrade?.trade_no || transactionId || "") || transactionId
          tradeState = alipayStatus

          if (localStatus !== "completed") {
            await db.collection("payments").where({ out_trade_no: paymentId }).update({
              status: "completed",
              transaction_id: transactionId,
              updated_at: new Date().toISOString(),
            })
          }
        }
      } catch (error) {
        console.error("[payment/status] alipay query failed, fallback local status:", error)
      }
    }

    if (finalStatus === "completed" && !paymentRecord?.credits_applied) {
      const referencePrefix = method === "alipay" ? "alipay" : "wechat"
      const applyResult = await applyCnPaymentCredits({
        db,
        paymentRecord: {
          ...paymentRecord,
          transaction_id: transactionId || paymentRecord?.transaction_id,
        },
        referenceId: `${referencePrefix}_${transactionId || paymentId}`,
      })

      if (!applyResult.success) {
        console.error("[payment/status] apply credits failed:", {
          paymentId,
          transactionId,
          method,
          error: applyResult.error,
          userEmail: applyResult.userEmail,
          planId: applyResult.planId,
          billingCycle: applyResult.billingCycle,
          creditsToAdd: applyResult.creditsToAdd,
        })
      } else {
        console.info("[payment/status] apply credits success:", {
          paymentId,
          transactionId,
          method,
          userEmail: applyResult.userEmail,
          planId: applyResult.planId,
          billingCycle: applyResult.billingCycle,
          creditsToAdd: applyResult.creditsToAdd,
          alreadyProcessed: applyResult.alreadyProcessed,
        })
      }
    }

    return NextResponse.json({
      success: true,
      paymentId,
      status: finalStatus,
      tradeState,
      transactionId,
      webhookConfirmed: Boolean(paymentRecord?.webhook_confirmed),
      method: method || paymentRecord?.payment_method || "unknown",
      amount: paymentRecord?.amount,
      currency: paymentRecord?.currency,
      createdAt: paymentRecord?.created_at,
    })
  } catch (error: any) {
    console.error("[payment/status] error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", status: "unknown" },
      { status: 500 }
    )
  }
}
