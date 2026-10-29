"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { handleMiniProgramDownload, isDownloadLikeUrl } from "@/lib/mp-download"
import { isMiniProgram } from "@/lib/wechat-mp"

export function MpDownloadGuard() {
  const { language } = useLanguage()

  useEffect(() => {
    if (!isMiniProgram()) return

    const successMessage =
      language === "zh"
        ? "已经复制，请到浏览器打开下载"
        : "Link copied. Open in browser to download."
    const errorMessage =
      language === "zh"
        ? "复制失败，请到浏览器打开下载"
        : "Copy failed. Please open in browser to download."

    const notifySuccess = () => toast.success(successMessage)
    const notifyError = () => toast.error(errorMessage)

    const handleAnchorDownload = (rawUrl: string | null | undefined) => {
      void handleMiniProgramDownload(rawUrl, {
        onSuccess: notifySuccess,
        onError: notifyError,
      })
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest("a")
      if (!anchor) return

      const rawUrl = anchor.getAttribute("href") || anchor.href || ""
      const isDownloadLink = isDownloadLikeUrl(rawUrl)

      if (!isDownloadLink) return

      event.preventDefault()
      handleAnchorDownload(rawUrl)
    }

    document.addEventListener("click", onDocumentClick, true)

    const nativeWindowOpen = window.open
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const rawUrl = typeof url === "string" ? url : url?.toString() || ""
      if (isDownloadLikeUrl(rawUrl)) {
        handleAnchorDownload(rawUrl)
        return null
      }

      return nativeWindowOpen.call(window, url as string | URL, target, features)
    }) as typeof window.open

    return () => {
      document.removeEventListener("click", onDocumentClick, true)
      window.open = nativeWindowOpen
    }
  }, [language])

  return null
}
