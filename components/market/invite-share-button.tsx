"use client"

import { useEffect, useMemo, useState } from "react"
import { Share2, Copy, QrCode, Send, Download } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { buildReferralShareLink, type ShareSource } from "@/lib/market/share-link"
import { canNativeShare, canSystemSharePoster, nativeShareLink, systemSharePoster } from "@/lib/market/share-client"
import { buildReferralPosterDataUrl, downloadReferralPoster } from "@/lib/market/share-poster"
import { ReferralPosterPreview } from "@/components/market/referral-poster-preview"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type InviteSummary = {
  referralCode: string
  shareUrl: string
}

const COPY_SOURCE: ShareSource = "copy"
const ANDROID_SHARE_SOURCE: ShareSource = "android_share"
const QR_SOURCE: ShareSource = "qr"

export function InviteShareButton({ toolId, toolTitle }: { toolId: string; toolTitle?: string }) {
  const { user } = useUser()
  const { language } = useLanguage()
  const isZh = language === "zh"

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<InviteSummary | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false)
  const [posterShareAvailable, setPosterShareAvailable] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [savingPoster, setSavingPoster] = useState(false)
  const [sharingPoster, setSharingPoster] = useState(false)

  useEffect(() => {
    setNativeShareAvailable(canNativeShare())
    setPosterShareAvailable(canSystemSharePoster())
  }, [])

  const targetPath = useMemo(() => `/tools/${encodeURIComponent(String(toolId || ""))}`, [toolId])
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const normalizedToolTitle = useMemo(() => {
    const rawTitle = String(toolTitle || "").trim()
    if (rawTitle) return rawTitle
    return String(toolId || "").trim() || "tool"
  }, [toolId, toolTitle])
  const posterTitle = isZh ? `${normalizedToolTitle} 邀请海报` : `${normalizedToolTitle} Invite Poster`
  const posterDescription = isZh
    ? `扫码直达 ${normalizedToolTitle}，点击使用时再登录。`
    : `Scan to open ${normalizedToolTitle} directly, then sign in when using it.`
  const posterCtaText = isZh ? "扫码打开并开始使用" : "Scan to open and start using"

  const shareText = isZh ? "我在 morntool 用这个工具，推荐你试试" : "I am using this tool on morntool, check it out"

  const promptLogin = () => {
    if (typeof window === "undefined") return

    const currentPath = `${window.location.pathname}${window.location.search || ""}`
    sessionStorage.setItem("post_login_redirect", currentPath)
    sessionStorage.setItem("auth_error", isZh ? "请先登录后再分享邀请" : "Please sign in before sharing")
    window.location.href = "/"
  }

  const loadSummary = async () => {
    if (!user?.id) return

    setLoading(true)
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
      setLoading(false)
    }
  }

  const openDialog = async () => {
    if (!user?.id) {
      promptLogin()
      return
    }

    setOpen(true)
    if (!summary && !loading) {
      await loadSummary()
    }
  }

  const getShareLinkBySource = (source: ShareSource) => {
    if (!summary?.referralCode || !origin) return ""
    return buildReferralShareLink({
      origin,
      referralCode: summary.referralCode,
      source,
      targetPath: targetPath,
    })
  }

  const getQrCodeImageUrl = () => {
    const shareUrl = getShareLinkBySource(QR_SOURCE)
    if (!shareUrl) return ""
    return `/api/tools/qr?size=280&ecc=M&data=${encodeURIComponent(shareUrl)}`
  }

  const onCopy = async () => {
    const link = getShareLinkBySource(COPY_SOURCE)
    if (!link) return

    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
      toast.success(isZh ? "链接已复制" : "Link copied")
    } catch {
      toast.error(isZh ? "复制失败" : "Copy failed")
    }
  }

  const onNativeShare = async () => {
    if (!summary?.referralCode) {
      await loadSummary()
      return
    }

    const link = getShareLinkBySource(ANDROID_SHARE_SOURCE)
    if (!link) return

    try {
      nativeShareLink({ url: link, text: shareText })
      toast.success(isZh ? "已打开系统分享" : "System share opened")
    } catch {
      toast.error(isZh ? "当前环境暂不支持系统分享，请复制链接分享" : "Native share unavailable, please copy link")
    }
  }

  const onSavePoster = async () => {
    if (!summary?.referralCode) {
      await loadSummary()
      return
    }

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
        fileName: `morntool-${String(toolId || "tool").trim() || "tool"}-poster.png`,
      })
      toast.success(isZh ? "海报已保存" : "Poster saved")
    } catch {
      toast.error(isZh ? "保存失败，请重试" : "Save failed, please retry")
    } finally {
      setSavingPoster(false)
    }
  }

  const onSystemSharePoster = async () => {
    if (!summary?.referralCode) {
      await loadSummary()
      return
    }

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
        fileName: `morntool-${String(toolId || "tool").trim() || "tool"}-poster.png`,
        text: shareText,
        fallbackUrl: fallbackShareUrl,
        allowLinkFallback: false,
      })

      toast.success(isZh ? "已打开系统分享" : "System share opened")
    } catch {
      toast.error(isZh ? "系统分享失败，请先保存海报再分享" : "System share failed. Please save poster first.")
    } finally {
      setSharingPoster(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => void openDialog()}>
        <Share2 className="h-4 w-4" />
        <span className="hidden md:inline">{isZh ? "分享邀请" : "Share Invite"}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <div className="max-h-[82vh] overflow-y-auto pr-1">
            <DialogHeader>
              <DialogTitle>{isZh ? "分享邀请" : "Share Invite"}</DialogTitle>
            <DialogDescription>
              {isZh
                ? "使用你的统一邀请链接，好友可直接进入当前工具页，点击使用时再登录。"
                : "Share your unified invite link. Friends can land on this tool directly and sign in only when using it."}
            </DialogDescription>
          </DialogHeader>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{isZh ? "当前工具邀请链接" : "Tool invite link"}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={getShareLinkBySource(COPY_SOURCE)} placeholder={loading ? "Loading..." : "-"} />
                  <Button
                    className="w-full sm:w-auto"
                    variant="outline"
                    onClick={() => void onCopy()}
                    disabled={!summary?.referralCode || loading}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? (isZh ? "已复制" : "Copied") : isZh ? "复制" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nativeShareAvailable ? (
                  <Button
                    className="w-full"
                    onClick={() => void onNativeShare()}
                    disabled={!summary?.referralCode || loading}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isZh ? "系统分享到应用" : "Share via Apps"}
                  </Button>
                ) : null}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowQr((current) => !current)}
                  disabled={!summary?.referralCode || loading}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  {showQr ? (isZh ? "收起二维码" : "Hide QR") : isZh ? "二维码分享" : "Share QR"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isZh ? "如果想分享到朋友圈，请使用二维码分享。" : "If you want to share to Moments, please use QR sharing."}
              </p>

              {showQr ? (
                <div className="space-y-3 pt-1">
                  <ReferralPosterPreview
                    qrImageUrl={getQrCodeImageUrl()}
                    qrAlt={isZh ? "邀请二维码海报" : "Invite Poster QR"}
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
                      disabled={!summary?.referralCode || loading || savingPoster || sharingPoster}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {savingPoster ? (isZh ? "保存中..." : "Saving...") : isZh ? "保存海报" : "Save Poster"}
                    </Button>
                    {posterShareAvailable ? (
                      <Button
                        className="w-full"
                        onClick={() => void onSystemSharePoster()}
                        disabled={!summary?.referralCode || loading || savingPoster || sharingPoster}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {sharingPoster ? (isZh ? "分享中..." : "Sharing...") : isZh ? "系统分享海报" : "Share Poster"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!nativeShareAvailable ? (
                <p className="text-xs text-muted-foreground">
                  {isZh ? "当前为 Web 端，可复制链接或二维码分享。" : "Web mode supports copy link and QR sharing."}
                </p>
              ) : null}
            </div>

            <DialogFooter className="pt-2 sm:pt-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {isZh ? "关闭" : "Close"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
