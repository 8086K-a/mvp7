import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/cloudbase-service'
import * as jwt from 'jsonwebtoken'
import { bindReferralFromRequest } from "@/lib/market/referrals"

function getWechatLoginConfig() {
    const appId = (process.env.WECHAT_APP_ID_weblogin || '').trim()
    const appSecret = (process.env.WECHAT_APP_SECRET_weblogin || '').trim()
    return { appId, appSecret }
}

function getSiteUrl(request: NextRequest) {
    return (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || "http://localhost:3000").trim()
}

function normalizeRedirectPath(rawValue: unknown): string {
    const raw = String(rawValue || "").trim()
    if (!raw) return "/"

    if (raw.startsWith("/") && !raw.startsWith("//")) {
        return raw
    }

    try {
        const parsed = new URL(raw)
        return `${parsed.pathname}${parsed.search || ""}`
    } catch {
        return "/"
    }
}

function encodeState(nextPath: string) {
    const payload = {
        next: normalizeRedirectPath(nextPath),
        nonce: Math.random().toString(36).slice(2, 10),
    }
    return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

function decodeStateToNextPath(state?: string | null): string {
    if (!state) return "/"
    try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
        return normalizeRedirectPath(decoded?.next)
    } catch {
        return "/"
    }
}

/**
 * 微信网页授权回调
 * 文档：https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
 */
export async function GET(req: NextRequest) {
    try {
        const siteUrl = getSiteUrl(req)
        const { appId, appSecret } = getWechatLoginConfig()
        const nextPath = decodeStateToNextPath(req.nextUrl.searchParams.get("state"))

        if (!appId || !appSecret) {
            console.log('⚠️ [WeChat] 微信登录未配置，重定向到首页')
            const target = new URL(nextPath || "/", siteUrl)
            target.searchParams.set("error", "wechat_not_configured")
            return NextResponse.redirect(target)
        }

        const searchParams = req.nextUrl.searchParams
        const code = searchParams.get('code')

        if (!code) {
            const target = new URL(nextPath || "/", siteUrl)
            target.searchParams.set("error", "wechat_auth_failed")
            return NextResponse.redirect(target)
        }

        const tokenResponse = await fetch(
            `https://api.weixin.qq.com/sns/oauth2/access_token?` +
            `appid=${appId}&` +
            `secret=${appSecret}&` +
            `code=${code}&` +
            `grant_type=authorization_code`
        )

        const tokenData = await tokenResponse.json()

        if (tokenData.errcode) {
            console.error('❌ 获取微信access_token失败:', tokenData)
            const target = new URL(nextPath || "/", siteUrl)
            target.searchParams.set("error", "wechat_token_failed")
            return NextResponse.redirect(target)
        }

        const { access_token, openid } = tokenData

        const userInfoResponse = await fetch(
            `https://api.weixin.qq.com/sns/userinfo?` +
            `access_token=${access_token}&` +
            `openid=${openid}&` +
            `lang=zh_CN`
        )

        const userInfo = await userInfoResponse.json()

        if (userInfo.errcode) {
            console.error('❌ 获取微信用户信息失败:', userInfo)
            const target = new URL(nextPath || "/", siteUrl)
            target.searchParams.set("error", "wechat_userinfo_failed")
            return NextResponse.redirect(target)
        }

        try {
            const cloudbaseDB = await getDatabase()

            const existingUser = await cloudbaseDB
                .collection('web_users')
                .where({
                    _openid: openid,
                })
                .get()

            const userData = {
                _openid: openid,
                nickname: userInfo.nickname,
                avatar: userInfo.headimgurl,
                avatar_url: userInfo.headimgurl,
                province: userInfo.province,
                city: userInfo.city,
                country: userInfo.country,
                sex: userInfo.sex,
                name: userInfo.nickname,
                pro: false,
                region: 'china',
                loginType: 'wechat',
                updated_at: new Date(),
            }

            let userId: string
            let isPro = false

            if (existingUser.data && existingUser.data.length > 0) {
                userId = existingUser.data[0]._id
                isPro = existingUser.data[0].pro || false
                await cloudbaseDB
                    .collection('web_users')
                    .doc(userId)
                    .update(userData)
            } else {
                const result = await cloudbaseDB
                    .collection('web_users')
                    .add({
                        ...userData,
                        created_at: new Date(),
                    })

                userId = result.id
            }

            const tokenPayload = {
                userId,
                openid,
                nickname: userInfo.nickname,
                region: 'china',
                loginType: 'wechat',
            }

            const expiresIn = isPro ? '90d' : '30d'

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET || 'fallback-secret-key-for-development-only',
                { expiresIn }
            )

            await bindReferralFromRequest({
                request: req,
                invitedUserId: userId,
                invitedEmail: String(existingUser?.data?.[0]?.email || "").trim().toLowerCase(),
            }).catch((error) => {
                console.error("[referral] bind in wechat callback failed:", error)
            })

            const redirectUrl = new URL(nextPath || "/", siteUrl)
            redirectUrl.searchParams.set('wechat_login', 'success')
            redirectUrl.searchParams.set('token', token)
            redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify({
                id: userId,
                name: userInfo.nickname,
                avatar: userInfo.headimgurl,
                avatar_url: userInfo.headimgurl,
                pro: false,
                region: 'china',
                loginType: 'wechat',
            })))

            return NextResponse.redirect(redirectUrl.toString())
        } catch (error) {
            console.error('❌ 保存微信用户信息失败:', error)
            const target = new URL(nextPath || "/", siteUrl)
            target.searchParams.set("error", "save_user_failed")
            return NextResponse.redirect(target)
        }
    } catch (error: any) {
        console.error('❌ 微信登录回调处理失败:', error)
        const siteUrl = getSiteUrl(req)
        const target = new URL("/", siteUrl)
        target.searchParams.set("error", "wechat_callback_failed")
        return NextResponse.redirect(target)
    }
}

export async function POST(req: NextRequest) {
    try {
        const { appId } = getWechatLoginConfig()
        if (!appId) {
            return NextResponse.json(
                { error: '微信登录未配置（缺少 WECHAT_APP_ID_weblogin）' },
                { status: 500 }
            )
        }

        const body = await req.json().catch(() => ({}))
        const siteUrl = getSiteUrl(req)
        const callbackUrl = `${siteUrl}/api/auth/wechat/callback`
        const redirectPath = normalizeRedirectPath(body?.redirectUrl)
        const state = encodeState(redirectPath)

        const authUrl =
            `https://open.weixin.qq.com/connect/qrconnect?` +
            `appid=${appId}&` +
            `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
            `response_type=code&` +
            `scope=snsapi_login&` +
            `state=${state}#wechat_redirect`

        return NextResponse.json({
            success: true,
            authUrl,
        })
    } catch (error: any) {
        console.error('❌ 构造微信授权URL失败:', error)
        return NextResponse.json(
            { error: '构造授权URL失败' },
            { status: 500 }
        )
    }
}
