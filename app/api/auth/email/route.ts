import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { getDatabase } from '@/lib/database/cloudbase-service'

import { DEPLOYMENT_REGION } from '@/lib/config/deployment.config'
import { FREE_USER_INITIAL_CREDITS } from '@/lib/credits/pricing'
import { verifyChinaEmailVerificationCode } from '@/lib/auth/china-email-code'
import { bindReferralFromRequest } from "@/lib/market/referrals"
// 服务器端Supabase客户端（无需localStorage）

function createServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
}

function createServerAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createClient(supabaseUrl, serviceRoleKey || anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
}

async function ensureSupabaseUserProfile(options: {
    id: string
    email: string
    fullName?: string
}) {
    const admin = createServerAdminClient()

    const { data: existing, error: existingError } = await admin
        .from('user')
        .select('*')
        .eq('id', options.id)
        .maybeSingle()

    if (existingError) {
        console.error('Load user profile error:', existingError)
    }

    if (existing) {
        return existing
    }

    const newProfile = {
        id: options.id,
        email: options.email,
        full_name: options.fullName || options.email.split('@')[0],
        credits: FREE_USER_INITIAL_CREDITS,
        subscription_tier: 'free',
    }

    const { data: inserted, error: insertError } = await admin
        .from('user')
        .insert(newProfile)
        .select('*')
        .maybeSingle()

    if (insertError) {
        console.error('Create user profile error:', insertError)
        // Fallback: return the in-memory defaults so UI has credits
        return newProfile
    }

    return inserted || newProfile
}

/**
 * 邮箱登录/注册API
 * 根据IP自动选择数据库：
 * - 国内IP → 腾讯云CloudBase
 * - 海外IP → Supabase
 */

// 获取客户端IP
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')

    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()
    return '8.8.8.8'
}

// 检测是否为中国IP
async function isChineseIP(ip: string): Promise<boolean> {
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`)
        const data = await response.json()
        return data.countryCode === 'CN'
    } catch (error) {
        console.error('IP检测失败:', error)
        return false // 默认为海外
    }
}

// 国内用户认证（使用腾讯云CloudBase数据库）
async function cloudbaseEmailAuth(email: string, password: string, mode: 'login' | 'signup') {
    try {
        console.log('[国内用户] 使用腾讯云CloudBase数据库')

        // 获取数据库连接
        let db;
        try {
            db = await getDatabase();
        } catch (error) {
            console.error('获取CloudBase数据库实例失败:', error);
            return { error: '数据库连接失败，请稍后重试' };
        }

        if (mode === 'signup') {
            // 检查邮箱是否已存在
            const existingUser = await db.collection('web_users').where({ email }).get()
            if (existingUser.data && existingUser.data.length > 0) {
                return { error: '该邮箱已被注册' }
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10)

            // 创建新用户
            const newUser = {
                email,
                password: hashedPassword,
                name: email.includes('@') ? email.split('@')[0] : email,
                pro: false,
                region: 'china',
                credits: FREE_USER_INITIAL_CREDITS,
                subscription_tier: 'free',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            const result = await db.collection('web_users').add(newUser)

            return {
                user: {
                    id: result.id,
                    email: email,
                    name: newUser.name,
                    pro: false,
                    region: 'china',
                    credits: newUser.credits,
                    subscription_tier: newUser.subscription_tier,
                }
            }
        } else {
            // 登录：查找用户
            let loginDb;
            try {
                loginDb = await getDatabase();
            } catch (error) {
                console.error('登录时获取CloudBase数据库实例失败:', error);
                return { error: '数据库连接失败，请稍后重试' };
            }

            const userResult = await loginDb.collection('web_users').where({ email }).get()
            console.log('用户数据:', userResult.data)
            if (!userResult.data || userResult.data.length === 0) {
                return { error: '用户不存在或密码错误' }
            }

            const user = userResult.data[0]
            // 验证密码
            if (!user.password) {
                return { error: '用户不存在或密码错误' }
            }

            const isPasswordValid = await bcrypt.compare(password, user.password)
            if (!isPasswordValid) {
                return { error: '用户不存在或密码错误' }
            }

            return {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    pro: user.pro || false,
                    region: 'china',
                    credits: Number.isFinite(user.credits) ? user.credits : FREE_USER_INITIAL_CREDITS,
                    subscription_tier: user.subscription_tier || 'free',
                }
            }
        }
    } catch (error) {
        console.error('国内用户认证错误:', error)
        return { error: '认证失败，请稍后重试' }
    }
}

// 海外用户认证（Supabase，region标记为overseas）
async function supabaseEmailAuth(email: string, password: string, mode: 'login' | 'signup') {
    try {
        console.log('[海外用户] 使用Supabase存储，region标记为overseas')

        const supabase = createServerClient()

        if (mode === 'signup') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        region: 'overseas', // 标记为海外用户
                        full_name: email.split('@')[0],
                    }
                }
            })

            if (error) {
                console.error('海外用户注册错误:', error)
                return { error: error.message }
            }

            if (!data.user) {
                return { error: 'Registration failed' }
            }

            const profile = await ensureSupabaseUserProfile({
                id: data.user.id,
                email: data.user.email || email,
                fullName: email.split('@')[0],
            })

            return {
                user: {
                    ...profile,
                    name: profile.full_name || email.split('@')[0],
                    pro: false,
                    region: 'overseas',
                }
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('海外用户登录错误:', error)
                return { error: error.message }
            }

            if (!data.user) {
                return { error: 'Login failed' }
            }

            const profile = await ensureSupabaseUserProfile({
                id: data.user.id,
                email: data.user.email || email,
                fullName: data.user.user_metadata?.full_name || email.split('@')[0],
            })

            return {
                user: {
                    ...profile,
                    name: profile.full_name || data.user.user_metadata?.full_name || email.split('@')[0],
                    pro: data.user.user_metadata?.pro || false,
                    region: data.user.user_metadata?.region || 'overseas',
                }
            }
        }
    } catch (error) {
        console.error('海外用户认证错误:', error)
        return { error: 'Authentication failed' }
    }
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, action, verificationCode, privacyAccepted } = await request.json()

        const authAction = String(action || "") as "login" | "signup"
        if (!["login", "signup"].includes(authAction)) {
            return NextResponse.json(
                { error: "不支持的认证操作" },
                { status: 400 }
            )
        }

        if (!email || !password) {
            return NextResponse.json(
                { error: '请填写完整信息' },
                { status: 400 }
            )
        }

        // 检测IP
        const clientIP = getClientIP(request)
        const isChina = await isChineseIP(clientIP)

        console.log(`📍 IP检测: ${clientIP} → ${isChina ? '🇨🇳 国内' : '🌍 海外'}`)

        // 验证密码长度
        if (password.length < 6) {
            return NextResponse.json(
                { error: '密码至少6位' },
                { status: 400 }
            )
        }

        // 根据IP选择认证方式
        let result
        if (DEPLOYMENT_REGION === 'CN') {
            console.log('🔐 [国内IP] 使用CloudBase数据库')

            if (privacyAccepted !== true) {
                return NextResponse.json(
                    { error: '请先勾选并同意隐私政策' },
                    { status: 400 }
                )
            }

            if (authAction === 'signup') {
                if (!verificationCode || !/^\d{6}$/.test(String(verificationCode))) {
                    return NextResponse.json(
                        { error: '请输入6位邮箱验证码' },
                        { status: 400 }
                    )
                }

                const verifyResult = await verifyChinaEmailVerificationCode({
                    email,
                    purpose: 'signup',
                    code: String(verificationCode),
                })

                if (!verifyResult.success) {
                    return NextResponse.json(
                        { error: verifyResult.error || '验证码错误或已过期，请重新获取' },
                        { status: 400 }
                    )
                }
            }

            result = await cloudbaseEmailAuth(email, password, authAction)
        } else {
            console.log('🔐 [海外IP] 使用Supabase数据库')
            result = await supabaseEmailAuth(email, password, authAction)
        }

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        const invitedUserId = String(result?.user?.id || "").trim()
        if (invitedUserId) {
            await bindReferralFromRequest({
                request,
                invitedUserId,
                invitedEmail: String(result?.user?.email || email || "").trim().toLowerCase(),
            }).catch((error) => {
                console.error("[referral] bind in email auth failed:", error)
            })
        }

        return NextResponse.json({
            success: true,
            user: result.user,
            database: DEPLOYMENT_REGION === 'CN' ? 'cloudbase' : 'supabase',
            region: DEPLOYMENT_REGION === 'CN' ? 'china' : 'overseas'
        })

    } catch (error) {
        console.error('邮箱认证API错误:', error)
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        )
    }
}
