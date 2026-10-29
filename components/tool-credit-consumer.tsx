"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"
import { consumeToolCredits } from "@/lib/credits/client"
import { TOOL_SUCCESS_EVENT, type ToolSuccessDetail } from "@/lib/credits/tool-success"

const REFERENCE_STORAGE_PREFIX = "morntool:consume-ref:"

function buildStorageKey(userId: string, toolId: string) {
  return `${REFERENCE_STORAGE_PREFIX}${userId}:${toolId}`
}

function newReferenceId(userId: string, toolId: string) {
  const random = Math.random().toString(36).slice(2, 10)
  return `consume_${toolId}_${userId}_${Date.now()}_${random}`.slice(0, 180)
}

/**
 * 幂等键必须在「重试」时保持不变，否则唯一索引永远撞不上，重试就是重复扣费。
 * 优先用业务侧传入的稳定单号；没有则生成一次并落到 sessionStorage，
 * 直到这次消费成功才清除 —— 网络超时 / 组件重挂载后重试会复用同一个 id。
 */
function resolveReferenceId(userId: string, toolId: string, eventReferenceId?: string) {
  const fromEvent = String(eventReferenceId || "").trim()
  if (fromEvent) return fromEvent.slice(0, 180)

  const storageKey = buildStorageKey(userId, toolId)
  try {
    const existing = window.sessionStorage.getItem(storageKey)
    if (existing) return existing
    const created = newReferenceId(userId, toolId)
    window.sessionStorage.setItem(storageKey, created)
    return created
  } catch {
    return newReferenceId(userId, toolId)
  }
}

function clearReferenceId(userId: string, toolId: string) {
  try {
    window.sessionStorage.removeItem(buildStorageKey(userId, toolId))
  } catch {
    // sessionStorage 不可用时忽略
  }
}

export function ToolCreditConsumer(props: {
  toolId: string
  creditCost?: number | null
  language: "zh" | "en"
}) {
  const { toolId, creditCost, language } = props
  const { user, isLoading, updateCredits } = useUser()
  const inFlightRef = useRef(false)
  const consumedRef = useRef(false)

  useEffect(() => {
    inFlightRef.current = false
    consumedRef.current = false
  }, [toolId, user?.id])

  useEffect(() => {
    if (isLoading || !user?.id || !toolId || consumedRef.current) return

    const cost = Number(creditCost || 0)
    if (!Number.isFinite(cost) || cost <= 0) return

    const consumeCredits = async (eventReferenceId?: string) => {
      if (inFlightRef.current || consumedRef.current) return
      inFlightRef.current = true

      const result = await consumeToolCredits({
        userId: user.id,
        toolId,
        referenceId: resolveReferenceId(user.id, toolId, eventReferenceId),
      })

      if ("newCredits" in result) {
        consumedRef.current = true
        clearReferenceId(user.id, toolId)
        updateCredits(result.newCredits)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("user-updated"))
        }
        inFlightRef.current = false
        return
      }

      const message = String(result.error || "")
      const insufficient = /insufficient credits/i.test(message)

      if (insufficient) {
        // 服务端已回滚占位，保留幂等键以便充值后用同一个 id 重试
        toast.error(
          language === "zh"
            ? "积分不足，无法使用该工具。请先购买积分。"
            : "Insufficient credits. Please purchase credits first.",
        )
      } else {
        // 网络/服务异常：保留幂等键，重试时不会重复扣费
        console.warn("[tool-credit-consumer] consume credits failed:", message || "unknown error")
      }
      inFlightRef.current = false
    }

    const onSuccess = (event: Event) => {
      const detail = (event as CustomEvent<ToolSuccessDetail | undefined>).detail
      if (!detail || detail.toolId !== toolId) return
      void consumeCredits(detail.referenceId)
    }

    window.addEventListener(TOOL_SUCCESS_EVENT, onSuccess as EventListener)
    return () => {
      window.removeEventListener(TOOL_SUCCESS_EVENT, onSuccess as EventListener)
    }
  }, [creditCost, isLoading, language, toolId, updateCredits, user?.id])

  return null
}
