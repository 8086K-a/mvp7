interface WxMiniProgram {
  postMessage?: (data: unknown) => void
  navigateTo?: (options: { url: string }) => void
  navigateBack?: (options?: { delta?: number }) => void
  getEnv?: (callback: (res: { miniprogram: boolean }) => void) => void
}

declare global {
  interface Window {
    wx?: { miniProgram?: WxMiniProgram }
    __wxjs_environment?: string
  }
}

const MP_ENV_QUERY_KEY = "_wxjs_environment"
const WECHAT_JSSDK_SRC = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js"
const WECHAT_JSSDK_SCRIPT_ID = "wechat-open-js-sdk"
const MP_LOGIN_REQUEST_DEBOUNCE_MS = 2000

let sdkLoadPromise: Promise<boolean> | null = null
let mpLoginRequestPromise: Promise<boolean> | null = null
let mpLoginLastRequestAt = 0

function decodeParam(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function isMiniProgram(): boolean {
  if (typeof window === "undefined") return false

  const ua = window.navigator.userAgent.toLowerCase()
  if (ua.includes("miniprogram")) return true

  if (window.__wxjs_environment === "miniprogram") return true

  const envFromQuery = new URLSearchParams(window.location.search).get(MP_ENV_QUERY_KEY)
  if ((envFromQuery || "").toLowerCase() === "miniprogram") return true

  return Boolean(getWxMiniProgram())
}

export function getWxMiniProgram(): WxMiniProgram | null {
  if (typeof window === "undefined") return null

  const wxObj = window.wx
  if (!wxObj || typeof wxObj !== "object") return null

  const miniProgram = wxObj.miniProgram
  if (!miniProgram || typeof miniProgram !== "object") return null

  return miniProgram
}

export function waitForWxSDK(timeout = 3000): Promise<WxMiniProgram | null> {
  return new Promise((resolve) => {
    const miniProgram = getWxMiniProgram()
    if (miniProgram) {
      resolve(miniProgram)
      return
    }

    const startedAt = Date.now()
    const timer = setInterval(() => {
      const target = getWxMiniProgram()
      if (target) {
        clearInterval(timer)
        resolve(target)
        return
      }

      if (Date.now() - startedAt >= timeout) {
        clearInterval(timer)
        resolve(null)
      }
    }, 100)
  })
}

async function ensureWxSdkLoaded(timeout = 5000): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (getWxMiniProgram()) return true
  if (!isMiniProgram()) return false

  if (sdkLoadPromise) {
    return sdkLoadPromise
  }

  sdkLoadPromise = new Promise<boolean>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let settled = false

    const finish = async (value: boolean) => {
      if (settled) return
      settled = true

      if (timer) {
        clearTimeout(timer)
      }

      if (value) {
        resolve(true)
        return
      }

      const mp = await waitForWxSDK(1200)
      resolve(Boolean(mp))
    }

    const existing = document.getElementById(WECHAT_JSSDK_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      void finish(false)
      return
    }

    const script = document.createElement("script")
    script.id = WECHAT_JSSDK_SCRIPT_ID
    script.src = WECHAT_JSSDK_SRC
    script.async = true
    script.onload = () => {
      void finish(false)
    }
    script.onerror = () => {
      void finish(false)
    }

    timer = setTimeout(() => {
      void finish(false)
    }, timeout)

    document.head.appendChild(script)
  }).finally(() => {
    sdkLoadPromise = null
  })

  return Boolean(await sdkLoadPromise)
}

export interface WxMpLoginCallback {
  token: string | null
  openid: string | null
  expiresIn: string | null
  nickName: string | null
  avatarUrl: string | null
  code: string | null
}

export function parseWxMpLoginCallback(): WxMpLoginCallback | null {
  if (typeof window === "undefined") return null

  const params = new URLSearchParams(window.location.search)
  const token = params.get("token")
  const openid = params.get("openid")
  const code = params.get("mpCode")

  const hasTokenPair = Boolean(token && openid)
  const hasCode = Boolean(code)

  if (!hasTokenPair && !hasCode) return null

  return {
    token,
    openid,
    expiresIn: params.get("expiresIn"),
    nickName: decodeParam(params.get("mpNickName")),
    avatarUrl: decodeParam(params.get("mpAvatarUrl")),
    code,
  }
}

export function clearWxMpLoginParams(): void {
  if (typeof window === "undefined") return

  const url = new URL(window.location.href)
  ;[
    "token",
    "openid",
    "expiresIn",
    "mpCode",
    "mpNickName",
    "mpAvatarUrl",
    "mpProfileTs",
    "mpReadyTs",
    "mpPongTs",
  ].forEach((key) => {
    url.searchParams.delete(key)
  })

  window.history.replaceState({}, "", url.toString())
}

export async function requestWxMpLogin(returnUrl?: string): Promise<boolean> {
  const now = Date.now()

  if (mpLoginRequestPromise) {
    return mpLoginRequestPromise
  }

  if (now - mpLoginLastRequestAt < MP_LOGIN_REQUEST_DEBOUNCE_MS) {
    return true
  }

  mpLoginLastRequestAt = now

  mpLoginRequestPromise = (async () => {
    let miniProgram = await waitForWxSDK(1200)

    if (!miniProgram && isMiniProgram()) {
      await ensureWxSdkLoaded(5000)
      miniProgram = await waitForWxSDK(2500)
    }

    if (!miniProgram) return false

    const currentUrl = returnUrl || window.location.href

    if (typeof miniProgram.navigateTo === "function") {
      const pageUrl = `/pages/webshell/login?returnUrl=${encodeURIComponent(currentUrl)}`
      miniProgram.navigateTo({ url: pageUrl })
      return true
    }

    if (typeof miniProgram.postMessage === "function") {
      miniProgram.postMessage({ data: { type: "REQUEST_WX_LOGIN", returnUrl: currentUrl } })
      return true
    }

    return false
  })()

  try {
    return await mpLoginRequestPromise
  } finally {
    mpLoginRequestPromise = null
  }
}

export async function exchangeCodeForToken(
  code: string,
  nickName?: string | null,
  avatarUrl?: string | null
): Promise<{
  success: boolean
  token?: string
  openid?: string
  expiresIn?: number
  userName?: string | null
  userAvatar?: string | null
  error?: string
}> {
  try {
    const response = await fetch("/api/wxlogin/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, nickName, avatarUrl }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.success || !data?.token || !data?.openid) {
      return {
        success: false,
        error: data?.message || data?.error || "登录失败",
      }
    }

    return {
      success: true,
      token: String(data.token),
      openid: String(data.openid),
      expiresIn: Number(data.expiresIn) || undefined,
      userName: typeof data.userName === "string" ? data.userName : null,
      userAvatar: typeof data.userAvatar === "string" ? data.userAvatar : null,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "网络错误",
    }
  }
}
