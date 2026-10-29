"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink, History, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const RECORD_DEDUPE_WINDOW_MS = 15_000

interface ToolHistoryPanelProps {
  toolId: string
  toolTitle: string
  toolDescription: string
  language: "zh" | "en"
}

interface ToolHistoryItem {
  id: string
  toolId: string
  toolTitle: string
  toolDescription: string | null
  toolUrl: string | null
  eventType: string
  createdAt: string
}

function formatTime(value: string, language: "zh" | "en") {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return "--"
  }

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function ToolHistoryPanel({ toolId, toolTitle, toolDescription, language }: ToolHistoryPanelProps) {
  const { user, isLoading } = useUser()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ToolHistoryItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [recording, setRecording] = useState(false)
  const [clearing, setClearing] = useState(false)

  const copy = useMemo(
    () =>
      language === "zh"
        ? {
            title: "历史记录",
            subtitle: "查看你在各个工具中的最近使用记录（云端同步）",
            loginRequired: "登录后即可跨设备查看工具历史记录。",
            loading: "正在加载历史记录...",
            empty: "暂无历史记录",
            sync: "正在同步最新记录...",
            clearAll: "清空历史",
            clearConfirm: "确认清空当前账号的全部工具历史记录吗？",
            clearSuccess: "历史记录已清空",
            clearFailed: "清空历史失败",
            loadFailed: "加载历史失败",
            openTool: "打开工具",
          }
        : {
            title: "History",
            subtitle: "View your recent usage across all tools (cloud synced)",
            loginRequired: "Sign in to keep and view tool history across devices.",
            loading: "Loading history...",
            empty: "No history yet",
            sync: "Syncing latest record...",
            clearAll: "Clear History",
            clearConfirm: "Clear all tool history for this account?",
            clearSuccess: "History cleared",
            clearFailed: "Failed to clear history",
            loadFailed: "Failed to load history",
            openTool: "Open tool",
          },
    [language],
  )

  const userId = String(user?.id || "").trim()
  const userEmail = String(user?.email || "").trim()
  const canSync = Boolean(userId || userEmail)

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {}
    if (userId) headers["x-user-id"] = userId
    if (userEmail) headers["x-user-email"] = userEmail
    return headers
  }, [userEmail, userId])

  const fetchHistory = useCallback(async () => {
    if (!canSync) {
      setItems([])
      return
    }

    setLoadingList(true)
    try {
      const response = await fetch("/api/tools/history?limit=100", {
        method: "GET",
        headers: authHeaders,
        cache: "no-store",
      })
      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || copy.loadFailed)
      }

      setItems(Array.isArray(result?.items) ? result.items : [])
    } catch (error: any) {
      toast.error(error?.message || copy.loadFailed)
    } finally {
      setLoadingList(false)
    }
  }, [authHeaders, canSync, copy.loadFailed])

  const recordOpenEvent = useCallback(async () => {
    if (!canSync) return

    const identity = userId || userEmail || "anonymous"
    const dedupeKey = `tool-history-open:${identity}:${toolId}`

    try {
      const now = Date.now()
      const previous = Number(sessionStorage.getItem(dedupeKey) || "0")
      if (now - previous < RECORD_DEDUPE_WINDOW_MS) {
        return
      }
      sessionStorage.setItem(dedupeKey, String(now))
    } catch {
      // ignore session storage errors
    }

    setRecording(true)
    try {
      const currentUrl =
        typeof window !== "undefined" ? `${window.location.pathname}${window.location.search || ""}` : `/tools/${toolId}`

      const response = await fetch("/api/tools/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          toolId,
          toolTitle,
          toolDescription,
          toolUrl: currentUrl,
          eventType: "open",
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        return
      }

      if (result?.item) {
        setItems((prev) => {
          const merged = [result.item, ...prev.filter((item) => item.id !== result.item.id)]
          return merged.slice(0, 100)
        })
      }
    } catch {
      // do not block UI on tracking failure
    } finally {
      setRecording(false)
    }
  }, [authHeaders, canSync, toolDescription, toolId, toolTitle, userEmail, userId])

  const clearHistory = useCallback(async () => {
    if (!canSync) return
    if (typeof window !== "undefined" && !window.confirm(copy.clearConfirm)) {
      return
    }

    setClearing(true)
    try {
      const response = await fetch("/api/tools/history", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || copy.clearFailed)
      }

      setItems([])
      toast.success(copy.clearSuccess)
    } catch (error: any) {
      toast.error(error?.message || copy.clearFailed)
    } finally {
      setClearing(false)
    }
  }, [authHeaders, canSync, copy.clearConfirm, copy.clearFailed, copy.clearSuccess])

  useEffect(() => {
    if (!isLoading && canSync) {
      void recordOpenEvent()
    }
  }, [canSync, isLoading, recordOpenEvent])

  useEffect(() => {
    if (open && canSync) {
      void fetchHistory()
    }
  }, [canSync, fetchHistory, open])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full" title={copy.title}>
          <History className="w-4 h-4" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full p-0 sm:max-w-xl">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.subtitle}</SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100vh-120px)] flex-col">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {!canSync ? copy.loginRequired : recording ? copy.sync : null}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => void clearHistory()}
              disabled={!canSync || clearing || items.length === 0}
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {copy.clearAll}
            </Button>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
            {isLoading || loadingList ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {copy.loading}
              </div>
            ) : !canSync ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {copy.loginRequired}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {copy.empty}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-medium">{item.toolTitle || item.toolId}</p>
                        {item.toolDescription ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{item.toolDescription}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatTime(item.createdAt, language)}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {item.toolId}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {item.eventType}
                      </Badge>
                    </div>

                    {item.toolUrl ? (
                      <a
                        href={item.toolUrl}
                        target={isExternalUrl(item.toolUrl) ? "_blank" : undefined}
                        rel={isExternalUrl(item.toolUrl) ? "noopener noreferrer" : undefined}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {copy.openTool}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
