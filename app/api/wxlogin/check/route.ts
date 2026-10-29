import { NextRequest, NextResponse } from "next/server"
import * as jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { FREE_USER_INITIAL_CREDITS } from "@/lib/credits/pricing"

export const runtime = "nodejs"

type WebUser = {
  _id?: string
  email?: string
  name?: string | null
  nickname?: string | null
  avatar?: string | null
  pro?: boolean
  region?: string
  credits?: number
  subscription_tier?: string | null
  wechatOpenId?: string | null
  wechatUnionId?: string | null
  _openid?: string | null
  created_at?: Date | string
  updated_at?: Date | string
  createdAt?: Date | string
  updatedAt?: Date | string
  last_login_at?: Date | string
  [key: string]: unknown
}

const DEFAULT_WECHAT_AVATAR =
  "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0"

function getMiniProgramConfig() {
  const candidates = [
    {
      source: "WX_MINI_*",
      appId: (process.env.WX_MINI_APPID || "").trim(),
      appSecret: (process.env.WX_MINI_SECRET || "").trim(),
    },
    {
      source: "WECHAT_*_weblogin",
      appId: (process.env.WECHAT_APP_ID_weblogin || "").trim(),
      appSecret: (process.env.WECHAT_APP_SECRET_weblogin || "").trim(),
    },
    {
      source: "NEXT_PUBLIC_WECHAT_*",
      appId: (process.env.NEXT_PUBLIC_WECHAT_APP_ID || "").trim(),
      appSecret: (process.env.NEXT_PUBLIC_WECHAT_APP_SECRET || "").trim(),
    },
    {
      source: "WECHAT_*",
      appId: (process.env.WECHAT_APP_ID || "").trim(),
      appSecret: (process.env.WECHAT_APP_SECRET || "").trim(),
    },
  ]

  for (const item of candidates) {
    if (item.appId && item.appSecret) {
      return item
    }
  }

  const partial = candidates.find((item) => item.appId || item.appSecret)
  if (partial) {
    console.warn("[wxlogin/check] Incomplete mini-program config pair:", {
      source: partial.source,
      hasAppId: Boolean(partial.appId),
      hasAppSecret: Boolean(partial.appSecret),
    })
  }

  return { source: "none", appId: "", appSecret: "" }
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  const nextEntries = Object.entries(record).filter(([, value]) => value !== undefined)
  return Object.fromEntries(nextEntries) as T
}

function wechatEmail(openid: string): string {
  return `wechat_${openid}@local.wechat`
}

async function queryOne(db: any, criteria: Record<string, unknown>): Promise<WebUser | null> {
  const result = await db.collection("web_users").where(criteria).limit(1).get()
  const user = result?.data?.[0]
  return user || null
}

async function findWechatUser(options: {
  db: any
  openid: string
  unionid?: string | null
}): Promise<WebUser | null> {
  const { db, openid, unionid } = options

  if (unionid) {
    const byUnionId = await queryOne(db, { wechatUnionId: unionid })
    if (byUnionId) return byUnionId
  }

  const byWechatOpenId = await queryOne(db, { wechatOpenId: openid })
  if (byWechatOpenId) return byWechatOpenId

  const byLegacyOpenId = await queryOne(db, { _openid: openid })
  if (byLegacyOpenId) return byLegacyOpenId

  const byEmail = await queryOne(db, { email: wechatEmail(openid) })
  if (byEmail) return byEmail

  return null
}

export async function POST(request: NextRequest) {
  try {
    if (resolveDeploymentRegion() !== "CN") {
      return NextResponse.json(
        { success: false, error: "UNSUPPORTED_REGION", message: "仅中国区支持小程序微信登录" },
        { status: 403 }
      )
    }

    const payload = (await request.json().catch(() => ({}))) as {
      code?: unknown
      nickName?: unknown
      avatarUrl?: unknown
    }
    const code = toNonEmptyString(payload?.code)
    const nickName = toNonEmptyString(payload?.nickName)
    const avatarUrl = toNonEmptyString(payload?.avatarUrl)

    if (!code) {
      return NextResponse.json(
        { success: false, error: "INVALID_PARAMS", message: "code is required" },
        { status: 400 }
      )
    }

    const { source, appId, appSecret } = getMiniProgramConfig()

    if (!appId || !appSecret) {
      console.error("[wxlogin/check] Missing mini-program app config")
      return NextResponse.json(
        { success: false, error: "CONFIG_ERROR", message: "服务端缺少小程序配置" },
        { status: 500 }
      )
    }

    console.log("[wxlogin/check] Using mini-program credential source:", source)

    const wxUrl =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}` +
      `&secret=${appSecret}` +
      `&js_code=${encodeURIComponent(code)}` +
      `&grant_type=authorization_code`

    const wxResponse = await fetch(wxUrl, { method: "GET", cache: "no-store" })
    const wxData = await wxResponse.json().catch(() => null)

    if (!wxResponse.ok || !wxData || wxData?.errcode || !wxData?.openid) {
      console.error("[wxlogin/check] jscode2session failed:", wxData)
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CODE",
          message: wxData?.errmsg || "code 无效或已过期",
        },
        { status: 401 }
      )
    }

    const openid = String(wxData.openid)
    const unionid = toNonEmptyString(wxData.unionid)

    const db = await getDatabase()
    const usersCollection = db.collection("web_users")
    const existingUser = await findWechatUser({ db, openid, unionid })

    const nowDate = new Date()
    const nowIso = nowDate.toISOString()

    let user: WebUser | null = existingUser

    if (!user) {
      const userName = nickName || "微信用户"
      const newUser = compactRecord({
        email: wechatEmail(openid),
        name: userName,
        nickname: userName,
        avatar: avatarUrl || null,
        wechatOpenId: openid,
        wechatUnionId: unionid || null,
        _openid: openid,
        region: "china",
        loginType: "wechat-mp",
        pro: false,
        credits: FREE_USER_INITIAL_CREDITS,
        subscription_tier: "free",
        createdAt: nowIso,
        updatedAt: nowIso,
        created_at: nowDate,
        updated_at: nowDate,
        last_login_at: nowDate,
      })

      const created = await usersCollection.add(newUser)
      user = { ...newUser, _id: created.id }
    } else {
      const shouldReplaceName = !toNonEmptyString(user?.name) || user?.name === "微信用户"
      const shouldReplaceAvatar = !toNonEmptyString(user?.avatar)
      const fallbackName = nickName || toNonEmptyString(user?.nickname) || "微信用户"
      const fallbackAvatar = avatarUrl || DEFAULT_WECHAT_AVATAR

      const patch = compactRecord({
        wechatOpenId: openid,
        wechatUnionId: unionid || user.wechatUnionId || null,
        _openid: openid,
        loginType: "wechat-mp",
        updatedAt: nowIso,
        updated_at: nowDate,
        last_login_at: nowDate,
        name: shouldReplaceName ? fallbackName : undefined,
        nickname: nickName || user.nickname || fallbackName,
        avatar: shouldReplaceAvatar ? fallbackAvatar : undefined,
      })

      if (Object.keys(patch).length > 0 && user._id) {
        await usersCollection.doc(user._id).update(patch)
      }

      user = { ...user, ...patch }
    }

    if (!user?._id) {
      console.error("[wxlogin/check] user upsert failed")
      return NextResponse.json(
        { success: false, error: "USER_UPSERT_FAILED", message: "用户创建失败" },
        { status: 500 }
      )
    }

    const isPro = Boolean(user.pro)
    const expiresIn = (isPro ? 90 : 30) * 24 * 60 * 60

    const tokenPayload = {
      userId: user._id,
      openid,
      unionid: unionid || null,
      nickname: user.name || user.nickname || null,
      region: "china",
      loginType: "wechat-mp",
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback-secret-key-for-development-only",
      { expiresIn: isPro ? "90d" : "30d" }
    )

    const hasProfile = Boolean(toNonEmptyString(user.name) && toNonEmptyString(user.avatar))

    return NextResponse.json({
      success: true,
      exists: Boolean(existingUser),
      hasProfile,
      openid,
      unionid: unionid || null,
      token,
      expiresIn,
      userName: user.name || user.nickname || null,
      userAvatar: user.avatar || null,
    })
  } catch (error) {
    console.error("[wxlogin/check] Error:", error)
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "服务器错误" },
      { status: 500 }
    )
  }
}
