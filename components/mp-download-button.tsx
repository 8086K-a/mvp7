"use client"

import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { isMiniProgram } from "@/lib/wechat-mp"
import { copyTextToClipboard } from "@/lib/mp-download"

interface MpDownloadButtonProps {
  blob: Blob | Promise<Blob> | null
  filename: string
  disabled?: boolean
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function MpDownloadButton({ blob, filename, disabled, variant = "outline", size, className }: MpDownloadButtonProps) {
  const { language } = useLanguage()
  const isInMiniProgram = isMiniProgram()
  const zh = language === "zh"

  const handleDownload = async () => {
    if (!blob) return

    const resolvedBlob = blob instanceof Promise ? await blob : blob

    if (isInMiniProgram) {
      // 在小程序中，转换为 data URL 并创建自动下载页面
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Download</title></head><body><script>const a=document.createElement('a');a.href='${dataUrl}';a.download='${filename}';a.click();</script></body></html>`
        const htmlBlob = new Blob([html], { type: 'text/html' })
        const htmlUrl = URL.createObjectURL(htmlBlob)

        copyTextToClipboard(htmlUrl).then(copied => {
          if (copied) {
            toast.success(zh ? "下载链接已复制，粘贴到浏览器打开即可下载" : "Download link copied. Paste in browser to download.")
          } else {
            toast.error(zh ? "复制失败" : "Copy failed")
          }
        })
      }
      reader.readAsDataURL(resolvedBlob)
    } else {
      // 在浏览器中，直接下载
      const url = URL.createObjectURL(resolvedBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={disabled || !blob}
      className={className}
    >
      {isInMiniProgram ? (
        <>
          <Copy className="w-4 h-4 mr-2" />
          {zh ? "复制下载链接" : "Copy Link"}
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          {zh ? "下载" : "Download"}
        </>
      )}
    </Button>
  )
}
