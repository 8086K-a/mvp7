"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Copy, QrCode, Send, Download } from "lucide-react"
import { toast } from "sonner"
import { buildReferralShareLink, type ShareSource } from "@/lib/market/share-link"
import { canNativeShare, canSystemSharePoster, nativeShareLink, systemSharePoster } from "@/lib/market/share-client"
import { buildReferralPosterDataUrl, downloadReferralPoster } from "@/lib/market/share-poster"
import { ReferralPosterPreview } from "@/components/market/referral-poster-preview"

type InviteSummary = {
  referralCode: string
  shareUrl: string
  clickCount: number
  invitedCount: number
  conversionRate: number
  rewardCredits: number
  inviterSignupBonus: number
  invitedSignupBonus: number
  inviterFirstUseBonus: number
  invitedFirstUseBonus: number
}

const COPY_SOURCE: ShareSource = "copy"
const ANDROID_SHARE_SOURCE: ShareSource = "android_share"
const QR_SOURCE: ShareSource = "qr"

export default function InvitePage() {
  const router = useRouter()
  const { user, isLoading } = useUser()
  const { language } = useLanguage()
  const isZh = language === "zh"

  const [summary, setSummary] = useState<InviteSummary | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false)
  const [posterShareAvailable, setPosterShareAvailable] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [savingPoster, setSavingPoster] = useState(false)
  const [sharingPoster, setSharingPoster] = useState(false)

  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/")
  }, [router])

  const ui = useMemo(
    () =>
      isZh
        ? {
            title: "邀请中心",
            subtitle: "你的统一邀请链接全站通用：可分享任意工具，点击使用时再登录。",
            loginRequiredTitle: "请先登录",
            loginRequiredDesc: "登录后即可查看邀请链接、邀请人数和奖励积分。",
            goLogin: "去登录",
            back: "返回",
            linkLabel: "统一邀请链接",
            statClicks: "总点击",
            statInvites: "累计邀请",
            statRewards: "累计奖励积分",
            statRate: "转化率",
            signupReward: "注册奖励",
            firstUseReward: "首次使用奖励",
            inviter: "邀请人",
            invited: "被邀请人",
            copied: "已复制",
            copy: "复制",
            shareViaApps: "系统分享到应用",
            showQr: "二维码分享",
            hideQr: "收起二维码",
            momentsHint: "如果想分享到朋友圈，请使用二维码分享。",
            qrHint: "扫码可直接打开邀请链接",
            qrAlt: "邀请二维码",
            webOnlyHint: "当前为 Web 端，可复制链接或二维码分享。",
            savePoster: "保存海报",
            savingPoster: "保存中...",
            sharePoster: "系统分享海报",
            sharingPoster: "分享中...",
            posterSaved: "海报已保存",
            posterSaveFailed: "保存失败，请重试",
            posterShareFailed: "系统分享失败，请先保存海报再分享",
          }
        : {
            title: "Invite Center",
            subtitle: "One unified invite link for all tools. Friends can open directly and sign in only when using.",
            loginRequiredTitle: "Sign in required",
            loginRequiredDesc: "Sign in to view your invite link, invite count, and reward credits.",
            goLogin: "Sign in",
            back: "Back",
            linkLabel: "Unified Invite Link",
            statClicks: "Clicks",
            statInvites: "Invites",
            statRewards: "Reward Credits",
            statRate: "Conversion",
            signupReward: "Signup Reward",
            firstUseReward: "First-use Reward",
            inviter: "Inviter",
            invited: "Invited",
            copied: "Copied",
            copy: "Copy",
            shareViaApps: "Share via Apps",
            showQr: "Share QR",
            hideQr: "Hide QR",
            momentsHint: "If you want to share to Moments, please use QR sharing.",
            qrHint: "Scan to open the invite link directly.",
            qrAlt: "Invite QR Code",
            webOnlyHint: "Web mode supports copy link and QR sharing.",
            savePoster: "Save Poster",
            savingPoster: "Saving...",
            sharePoster: "Share Poster",
            sharingPoster: "Sharing...",
            posterSaved: "Poster saved",
            posterSaveFailed: "Save failed, please retry",
            posterShareFailed: "System share failed. Please save poster first.",
          },
    [isZh],
  )

  const refresh = useCallback(async () => {
    if (!user?.id) return
    setLoadingData(true)
    setError("")
    try {
      const response = await fetch(`/api/invite/summary?userId=${encodeURIComponent(String(user.id))}`, { cache: "no-store" })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to load invite summary")
      }
      setSummary(result.summary || null)
    } catch (err: any) {
      setError(err?.message || "Load failed")
    } finally {
      setLoadingData(false)
    }
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setNativeShareAvailable(canNativeShare())
    setPosterShareAvailable(canSystemSharePoster())
  }, [])

  const shareText = isZh ? "我在 morntool 用这些工具，推荐你试试" : "I am using tools on morntool, check it out"

  const getShareLinkBySource = (source: ShareSource) => {
    if (!summary?.referralCode || typeof window === "undefined") return ""

    return buildReferralShareLink({
      origin: window.location.origin,
      referralCode: summary.referralCode,
      targetPath: "/",
      source,
    })
  }

  const getQrCodeImageUrl = () => {
    const shareUrl = getShareLinkBySource(QR_SOURCE)
    if (!shareUrl) return ""
    return `/api/tools/qr?size=280&ecc=M&data=${encodeURIComponent(shareUrl)}`
  }
  const posterTitle = isZh ? "morntool 邀请海报" : "morntool Invite Poster"
  const posterDescription = isZh
    ? "扫码注册并体验 morntool 工具，双方均可获得积分奖励。"
    : "Scan to join morntool and use tools. Both sides can earn reward credits."
  const posterCtaText = isZh ? "扫码打开并开始使用" : "Scan to open and start using"

  const copyLink = async () => {
    const shareUrl = getShareLinkBySource(COPY_SOURCE)
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
      toast.success(isZh ? "链接已复制" : "Link copied")
    } catch {
      setCopied(false)
      toast.error(isZh ? "复制失败" : "Copy failed")
    }
  }

  const onNativeShare = async () => {
    const shareUrl = getShareLinkBySource(ANDROID_SHARE_SOURCE)
    if (!shareUrl) return

    try {
      nativeShareLink({ url: shareUrl, text: shareText })
      toast.success(isZh ? "已打开系统分享" : "System share opened")
    } catch {
      toast.error(isZh ? "当前环境暂不支持系统分享，请复制链接分享" : "Native share unavailable, please copy link")
    }
  }

  const onSavePoster = async () => {
    if (!summary?.referralCode) return

    const qrImageUrl = getQrCodeImageUrl()
    if (!qrImageUrl) return

    setSavingPoster(true)
    try {
      await downloadReferralPoster({
        qrImageUrl,
        title: posterTitle,
        description: posterDescription,
        ctaText: posterCtaText,
        language: isZh ? "zh" : "en",
        fileName: "morntool-invite-poster.png",
      })
      toast.success(ui.posterSaved)
    } catch {
      toast.error(ui.posterSaveFailed)
    } finally {
      setSavingPoster(false)
    }
  }

  const onSystemSharePoster = async () => {
    if (!summary?.referralCode) return

    const fallbackShareUrl = getShareLinkBySource(ANDROID_SHARE_SOURCE)
    if (!fallbackShareUrl) return

    setSharingPoster(true)
    try {
      const posterDataUrl = await buildReferralPosterDataUrl({
        qrImageUrl: getQrCodeImageUrl(),
        title: posterTitle,
        description: posterDescription,
        ctaText: posterCtaText,
        language: isZh ? "zh" : "en",
      })

      await systemSharePoster({
        posterDataUrl,
        fileName: "morntool-invite-poster.png",
        text: shareText,
        fallbackUrl: fallbackShareUrl,
        allowLinkFallback: false,
      })

      toast.success(isZh ? "已打开系统分享" : "System share opened")
    } catch {
      toast.error(ui.posterShareFailed)
    } finally {
      setSharingPoster(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-4">
        <Button variant="ghost" size="sm" className="h-8 px-1 gap-1" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          {ui.back}
        </Button>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {isZh ? "正在加载..." : "Loading..."}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-4">
        <Button variant="ghost" size="sm" className="h-8 px-1 gap-1" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          {ui.back}
        </Button>
        <div className="max-w-lg rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold">{ui.loginRequiredTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{ui.loginRequiredDesc}</p>
          <Button
            className="mt-6"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("auth_error", isZh ? "请先登录后查看邀请中心" : "Please sign in to use Invite Center")
                sessionStorage.setItem("post_login_redirect", "/invite")
                window.location.href = "/"
              }
            }}
          >
            {ui.goLogin}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-10 space-y-6">
      <Button variant="ghost" size="sm" className="h-8 px-1 gap-1 w-fit" onClick={goBack}>
        <ArrowLeft className="h-4 w-4" />
        {ui.back}
      </Button>

      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{ui.title}</h1>
        <p className="text-sm text-muted-foreground">{ui.subtitle}</p>
      </section>

      {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-xs text-muted-foreground">{ui.statClicks}</div>
          <div className="mt-1 text-2xl font-semibold">{summary?.clickCount ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-xs text-muted-foreground">{ui.statInvites}</div>
          <div className="mt-1 text-2xl font-semibold">{summary?.invitedCount ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-xs text-muted-foreground">{ui.statRewards}</div>
          <div className="mt-1 text-2xl font-semibold">{summary?.rewardCredits ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-xs text-muted-foreground">{ui.statRate}</div>
          <div className="mt-1 text-2xl font-semibold">{summary?.conversionRate ?? 0}%</div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold">{ui.linkLabel}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{ui.linkLabel}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{ui.linkLabel}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={getShareLinkBySource(COPY_SOURCE)} readOnly />
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => void copyLink()}
              disabled={!summary?.referralCode || loadingData}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? ui.copied : ui.copy}
            </Button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
            <p className="font-medium">{ui.signupReward}</p>
            <p className="text-muted-foreground">
              {ui.inviter} +{summary?.inviterSignupBonus ?? 60} / {ui.invited} +{summary?.invitedSignupBonus ?? 20}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
            <p className="font-medium">{ui.firstUseReward}</p>
            <p className="text-muted-foreground">
              {ui.inviter} +{summary?.inviterFirstUseBonus ?? 20} / {ui.invited} +{summary?.invitedFirstUseBonus ?? 10}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {nativeShareAvailable ? (
            <Button
              className="w-full"
              onClick={() => void onNativeShare()}
              disabled={!summary?.referralCode || loadingData}
            >
              <Send className="mr-2 h-4 w-4" />
              {ui.shareViaApps}
            </Button>
          ) : null}
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setShowQr((current) => !current)}
            disabled={!summary?.referralCode || loadingData}
          >
            <QrCode className="mr-2 h-4 w-4" />
            {showQr ? ui.hideQr : ui.showQr}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{ui.momentsHint}</p>

        {showQr ? (
          <div className="space-y-3 pt-1">
            <ReferralPosterPreview
              qrImageUrl={getQrCodeImageUrl()}
              qrAlt={ui.qrAlt}
              title={posterTitle}
              description={posterDescription}
              ctaText={posterCtaText}
              loadingText={isZh ? "二维码生成中..." : "Generating QR..."}
              errorText={isZh ? "二维码加载失败，请重试" : "Failed to load QR"}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => void onSavePoster()}
                disabled={!summary?.referralCode || loadingData || savingPoster || sharingPoster}
              >
                <Download className="mr-2 h-4 w-4" />
                {savingPoster ? ui.savingPoster : ui.savePoster}
              </Button>
              {posterShareAvailable ? (
                <Button
                  className="w-full"
                  onClick={() => void onSystemSharePoster()}
                  disabled={!summary?.referralCode || loadingData || savingPoster || sharingPoster}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sharingPoster ? ui.sharingPoster : ui.sharePoster}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground text-center sm:text-left">{ui.qrHint}</p>
          </div>
        ) : null}

        {!nativeShareAvailable ? <p className="text-xs text-muted-foreground">{ui.webOnlyHint}</p> : null}
      </section>
    </div>
  )
}
