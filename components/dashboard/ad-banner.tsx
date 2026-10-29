"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type AdRecord = {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
}

function isValidImageUrl(url: string) {
  return /^https?:\/\//i.test(String(url || "").trim())
}

export function AdBanner({ placement = "dashboard_top", className }: { placement?: string; className?: string }) {
  const deploymentRegion =
    String(process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || "CN").toUpperCase() === "INTL"
      ? "INTL"
      : "CN"

  const [ads, setAds] = useState<AdRecord[]>([])
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({})
  const [closedIds, setClosedIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(
          `/api/ads?region=${deploymentRegion}&placement=${encodeURIComponent(placement)}`
        )
        const result = await response.json()
        if (!response.ok || !result?.success) return
        setAds(result.ads || [])
      } catch {
        // ignore ad errors
      }
    }

    run()
  }, [deploymentRegion, placement])

  const visibleAds = useMemo(
    () => ads.filter((ad) => isValidImageUrl(ad.imageUrl) && !brokenIds[ad.id] && !closedIds[ad.id]),
    [ads, brokenIds, closedIds]
  )

  const reportClick = (adId: string) => {
    const body = JSON.stringify({ adId, placement, region: deploymentRegion })

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" })
      navigator.sendBeacon("/api/ads/click", blob)
      return
    }

    fetch("/api/ads/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined)
  }

  const isCard = ["sidebar", "sidebar_bottom"].includes(placement)
  const heightClass = isCard ? "h-48" : "h-20 md:h-24"

  if (!visibleAds.length) return null

  return (
    <div className={cn("mb-6 space-y-3", className)}>
      {visibleAds.slice(0, 2).map((ad) => (
        <div
          key={ad.id}
          className="relative group block overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition"
        >
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setClosedIds((prev) => ({ ...prev, [ad.id]: true }))
            }}
            className="absolute top-2 right-2 p-1 bg-background/80 hover:bg-background rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Close ad"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
          <a
            href={ad.linkUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => reportClick(ad.id)}
            className="block"
          >
            <img
              src={ad.imageUrl}
              alt={ad.title || "ad"}
              className={cn("w-full object-cover", heightClass)}
              onError={() => setBrokenIds((prev) => ({ ...prev, [ad.id]: true }))}
            />
          </a>
        </div>
      ))}
    </div>
  )
}
