"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDownToLine, ArrowLeft, ChevronRight, Monitor, Smartphone } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"
import { useTranslations } from "@/lib/i18n"
import { toast } from "sonner"
import { handleMiniProgramDownload } from "@/lib/mp-download"

type Region = "CN" | "INTL"

type DownloadPackage = {
  id: string
  region: Region
  platform: string
  version: string
  releaseNotes?: string | null
  createdAt?: string
}

const PLATFORM_ORDER = ["android", "ios", "windows", "macos"] as const

export default function DownloadsPage() {
  const { language } = useLanguage()
  const t = useTranslations(language)

  const deploymentRegion: Region =
    String(process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || "CN").toUpperCase() === "INTL"
      ? "INTL"
      : "CN"

  const [packages, setPackages] = useState<DownloadPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user")
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const loadPackages = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/downloads/packages?region=${deploymentRegion}`)
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || t.common?.error || "Failed to load")
      }

      const regionPackages = Array.isArray(result.packages)
        ? result.packages.filter((item: DownloadPackage) => item.region === deploymentRegion)
        : []

      setPackages(regionPackages)
    } catch (err: any) {
      setError(err?.message || t.common?.error || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPackages()
  }, [deploymentRegion])

  const handleDownload = async (pkg: DownloadPackage) => {
    const query = new URLSearchParams({ region: pkg.region })

    if (user?.id) query.set("userId", user.id)
    if (user?.email) query.set("userEmail", user.email)

    const downloadUrl = `/api/downloads/file/${encodeURIComponent(pkg.id)}?${query.toString()}`
    const blockedByMiniProgram = await handleMiniProgramDownload(downloadUrl, {
      onSuccess: () =>
        toast.success(
          language === "zh" ? "已经复制，请到浏览器打开下载" : "Link copied. Open in browser to download."
        ),
      onError: () =>
        toast.error(
          language === "zh" ? "复制失败，请到浏览器打开下载" : "Copy failed. Please open in browser to download."
        ),
    })

    if (blockedByMiniProgram) return
    window.location.href = downloadUrl
  }

  const displayPackages = PLATFORM_ORDER
    .map((platform) => {
      const pkg = packages.find((item) => String(item.platform || "").toLowerCase() === platform)
      return pkg ? { ...pkg, platform } : null
    })
    .filter(Boolean) as Array<DownloadPackage & { platform: string }>

  const releaseItems = displayPackages.slice(0, 2).map((pkg, index) => {
    const fallbackText =
      index === 0
        ? t.download?.latestRelease || "Latest release"
        : t.download?.performanceFixes || "Performance and bug fixes"
    return {
      text: (pkg.releaseNotes || "").trim() || fallbackText,
      date: formatShortDate(pkg.createdAt, language) || "--",
    }
  })

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-lg text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.download?.back || "Back"}</span>
          </Link>
        </div>

        <div className="text-center pt-2 pb-1">
          <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <ArrowDownToLine className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t.download?.title || "Downloads"}</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          {loading ? <p className="text-sm text-muted-foreground">{t.download?.loadingPackages || "Loading packages..."}</p> : null}
          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="space-y-4">
            {releaseItems.length > 0 ? (
              releaseItems.map((item, index) => (
                <div key={`${item.text}-${index}`} className="flex items-center justify-between gap-4">
                  <div className="text-base md:text-lg font-semibold text-foreground">{item.text}</div>
                  <div className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium text-muted-foreground">
                    {item.date}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t.download?.noPackages || "No packages available"}</p>
            )}

            <button type="button" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition">
              {t.download?.viewMoreLogs || "View more logs"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayPackages.map((pkg) => {
            const label = getPlatformLabel(pkg.platform, t)
            const isPrimary = pkg.platform === "macos"
            return (
              <button
                key={`${pkg.region}-${pkg.id}`}
                type="button"
                onClick={() => void handleDownload(pkg)}
                className="group text-center"
              >
                <div
                  className={`mx-auto w-24 h-24 rounded-full border flex items-center justify-center transition ${
                    isPrimary
                      ? "border-primary ring-4 ring-primary/20 bg-primary/10"
                      : "border-border bg-muted/40 group-hover:border-primary/40"
                  }`}
                >
                  {pkg.platform === "windows" ? (
                    <Monitor className={`w-8 h-8 ${isPrimary ? "text-primary" : "text-muted-foreground"}`} />
                  ) : (
                    <Smartphone className={`w-8 h-8 ${isPrimary ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                </div>

                <div className={`mt-2.5 text-base font-semibold ${isPrimary ? "text-primary" : "text-foreground"}`}>
                  {label}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{t.download?.version || "Version"} {pkg.version || "--"}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getPlatformLabel(platform: string, t: any) {
  const key = String(platform || "").toLowerCase()
  if (key === "android") return t.download?.platform?.android || "Android"
  if (key === "ios") return t.download?.platform?.ios || "iOS"
  if (key === "windows") return t.download?.platform?.windows || "Windows"
  if (key === "macos") return t.download?.platform?.macos || "macOS"
  return platform
}

function formatShortDate(input?: string, language = "zh") {
  if (!input) return ""
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ""

  const locale = language === "zh" ? "zh-CN" : "en-US"
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date)
}
