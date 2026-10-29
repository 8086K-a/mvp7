import { isMiniProgram } from "@/lib/wechat-mp"

interface MiniProgramDownloadHandlers {
  onSuccess?: () => void
  onError?: () => void
}

const BLOB_OR_DATA_URL_PATTERN = /^(blob:|data:)/i
const DOWNLOAD_URL_PATTERN = /(\/api\/downloads\/file\/|\/api\/tools\/storage\/files\/|[?&]download=1\b)/i
const DOWNLOAD_FILE_EXTENSION_PATTERN =
  /\.(apk|ipa|exe|msi|dmg|pkg|deb|rpm|appimage|zip|rar|7z|tar|gz|bz2|xz|pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|jpg|jpeg|png|gif|webp|svg|mp3|wav|mp4|mov|avi|mkv)(?:[?#]|$)/i

export function isDownloadLikeUrl(rawUrl: string | null | undefined): boolean {
  const normalizedUrl = String(rawUrl || "").trim()
  if (!normalizedUrl) return false
  if (BLOB_OR_DATA_URL_PATTERN.test(normalizedUrl)) return false

  return DOWNLOAD_URL_PATTERN.test(normalizedUrl) || DOWNLOAD_FILE_EXTENSION_PATTERN.test(normalizedUrl)
}

export function resolveDownloadCopyUrl(rawUrl: string | null | undefined): string {
  if (typeof window === "undefined") return String(rawUrl || "")

  const normalizedUrl = String(rawUrl || "").trim()
  if (!normalizedUrl || BLOB_OR_DATA_URL_PATTERN.test(normalizedUrl)) {
    return window.location.href
  }

  try {
    return new URL(normalizedUrl, window.location.origin).toString()
  } catch {
    return window.location.href
  }
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof window === "undefined") return false

  const text = String(value || "").trim()
  if (!text) return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fallback to execCommand below
  }

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "readonly")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    textarea.style.pointerEvents = "none"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const copied = document.execCommand("copy")
    document.body.removeChild(textarea)
    return copied
  } catch {
    return false
  }
}

export async function handleMiniProgramDownload(
  rawUrl: string | null | undefined,
  handlers: MiniProgramDownloadHandlers = {}
): Promise<boolean> {
  if (typeof window === "undefined" || !isMiniProgram()) return false
  if (!isDownloadLikeUrl(rawUrl)) return false

  const copyUrl = resolveDownloadCopyUrl(rawUrl)
  const copied = await copyTextToClipboard(copyUrl)

  if (copied) {
    handlers.onSuccess?.()
  } else {
    handlers.onError?.()
  }

  return true
}
