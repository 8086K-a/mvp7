import { NextRequest, NextResponse } from "next/server"
import * as jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { bindReferralFromRequest } from "@/lib/market/referrals"

export const runtime = "nodejs"

type CallbackPayload = {
  token?: unknown
  openid?: unknown
  unionid?: unknown
  expiresIn?: unknown
  nickName?: unknown
  avatarUrl?: unknown
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function parseExpiresIn(value: unknown): number {
  const fallback = 60 * 60 * 24 * 30
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  const nextEntries = Object.entries(record).filter(([, value]) => value !== undefined)
  return Object.fromEntries(nextEntries) as T
}

export async function POST(req: NextRequest) {
  try {
    if (resolveDeploymentRegion() !== "CN") {
      return NextResponse.json(
        { success: false, error: "UNSUPPORTED_REGION", message: "仅中国区支持小程序微信登录" },
        { status: 403 }
      )
    }

    const payload = (await req.json().catch(() => ({}))) as CallbackPayload
    const token = toNonEmptyString(payload.token)
    const openid = toNonEmptyString(payload.openid)
    const nickName = toNonEmptyString(payload.nickName)
    const avatarUrl = toNonEmptyString(payload.avatarUrl)
    const expiresIn = parseExpiresIn(payload.expiresIn)

    if (!token || !openid) {
      return NextResponse.json(
        { success: false, error: "INVALID_PARAMS", message: "token and openid are required" },
        { status: 400 }
      )
    }

    let decoded: any
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret-key-for-development-only"
      )
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_TOKEN", message: "token 无效或已过期" },
        { status: 401 }
      )
    }

    const tokenOpenid = toNonEmptyString(decoded?.openid)
    if (tokenOpenid && tokenOpenid !== openid) {
      return NextResponse.json(
        { success: false, error: "OPENID_MISMATCH", message: "openid 与 token 不匹配" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("web_users")

    const byWechatOpenId = await usersCollection.where({ wechatOpenId: openid }).limit(1).get()
    const byLegacyOpenId =
      byWechatOpenId?.data?.[0]
        ? null
        : await usersCollection.where({ _openid: openid }).limit(1).get()

    const user = byWechatOpenId?.data?.[0] || byLegacyOpenId?.data?.[0]

    if (user?._id) {
      const nowDate = new Date()
      const patch = compactRecord({
        updatedAt: nowDate.toISOString(),
        updated_at: nowDate,
        last_login_at: nowDate,
        name:
          nickName && (!toNonEmptyString(user?.name) || user?.name === "微信用户")
            ? nickName
            : undefined,
        nickname: nickName || user.nickname,
        avatar: avatarUrl && !toNonEmptyString(user?.avatar) ? avatarUrl : undefined,
      })

      if (Object.keys(patch).length > 0) {
        await usersCollection.doc(user._id).update(patch)
      }
    }

    const safeUser = compactRecord({
      id: decoded?.userId || user?._id,
      email: user?.email,
      name: nickName || user?.name || user?.nickname || "微信用户",
      avatar: avatarUrl || user?.avatar || null,
      pro: Boolean(user?.pro),
      region: "china",
      loginType: "wechat-mp",
      credits: Number.isFinite(user?.credits) ? Number(user?.credits) : 0,
      subscription_tier: user?.subscription_tier || (user?.pro ? "pro" : "free"),
    })

    const invitedUserId = String((safeUser as any)?.id || "").trim()
    if (invitedUserId) {
      await bindReferralFromRequest({
        request: req,
        invitedUserId,
        invitedEmail: String((safeUser as any)?.email || "").trim().toLowerCase(),
      }).catch((error) => {
        console.error("[referral] bind in mp-callback failed:", error)
      })
    }

    const response = NextResponse.json({ success: true, openid, user: safeUser })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn,
      path: "/",
    })

    response.cookies.set("auth-user", encodeURIComponent(JSON.stringify(safeUser)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[mp-callback] Error:", error)
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "服务器错误" },
      { status: 500 }
    )
  }
}
