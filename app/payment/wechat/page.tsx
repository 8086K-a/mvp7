"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, QrCode, RefreshCcw, XCircle } from "lucide-react"

type PollStatus = "pending" | "success" | "failed"

export default function WechatPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const paymentId = searchParams.get("paymentId") || ""
  const planId = searchParams.get("planId") || ""
  const method = searchParams.get("method") || "wechatpay"
  const qrCodeUrl = searchParams.get("qrCodeUrl") || ""
  const qrImageSrc = qrCodeUrl
    ? /^https?:\/\//i.test(qrCodeUrl)
      ? qrCodeUrl
      : `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrCodeUrl)}`
    : ""

  const [status, setStatus] = useState<PollStatus>("pending")
  const [message, setMessage] = useState("请使用微信扫码完成支付")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [stopPolling, setStopPolling] = useState(false)

  const hasRequiredParams = useMemo(() => Boolean(paymentId && planId), [paymentId, planId])

  const checkStatus = async () => {
    if (!paymentId) return

    setIsRefreshing(true)
    try {
      const response = await fetch(
        `/api/payment/status?paymentId=${encodeURIComponent(paymentId)}&method=${encodeURIComponent(method)}`
      )
      const result = await response.json()

      if (!response.ok || result?.success === false) {
        return
      }

      const paymentStatus = String(result?.status || "").toLowerCase()
      if (result?.webhookConfirmed) {
        setStopPolling(true)
      }
      if (paymentStatus === "completed") {
        setStatus("success")
        setMessage("支付成功，正在同步积分...")
        setStopPolling(true)
        router.replace(`/payment/success?out_trade_no=${encodeURIComponent(paymentId)}&planId=${encodeURIComponent(planId)}`)
        return
      }

      if (paymentStatus === "failed" || paymentStatus === "closed") {
        setStatus("failed")
        setMessage("支付未完成，请重新发起支付")
        setStopPolling(true)
      }
    } catch {
      // ignore temporary polling errors
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!hasRequiredParams) {
      setStatus("failed")
      setMessage("缺少支付参数，请返回重新下单")
      return
    }

    if (stopPolling) {
      return
    }

    const intervalMs = pollCount < 20 ? 3000 : 10000
    const timer = setInterval(() => {
      checkStatus()
      setPollCount((prev) => prev + 1)
    }, intervalMs)

    checkStatus()

    return () => clearInterval(timer)
  }, [hasRequiredParams, paymentId, method, pollCount, stopPolling])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        {status === "pending" && <QrCode className="h-12 w-12 text-primary mx-auto mb-4" />}
        {status === "success" && <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />}
        {status === "failed" && <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />}

        <h1 className="text-2xl font-bold mb-2">微信扫码支付</h1>
        <p className="text-muted-foreground mb-6">{message}</p>

        {qrCodeUrl ? (
          <div className="rounded-xl border border-border bg-card p-4 mb-6">
            <img src={qrImageSrc} alt="WeChat Pay QR" className="mx-auto w-64 h-64 object-contain" />
            <p className="text-xs text-muted-foreground mt-3 break-all">订单号: {paymentId}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-6">未获取到二维码，请返回重新下单。</p>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={checkStatus}
            disabled={isRefreshing}
            className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 font-medium"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            刷新支付状态
          </button>
          <Link
            href="/subscription"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground"
          >
            返回积分套餐
          </Link>
        </div>
      </div>
    </div>
  )
}
