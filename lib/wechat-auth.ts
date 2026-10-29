import OAuth from 'wechat-oauth'
import { getSupabaseClient } from './supabase'

interface WeChatTokenResult {
    data: {
        access_token: string
        openid: string
        refresh_token: string
        scope: string
        unionid?: string
    }
}

interface WeChatUserInfo {
    openid: string
    nickname: string
    sex: number
    province: string
    city: string
    country: string
    headimgurl: string
    privilege: string[]
    unionid?: string
}

function getWechatLoginConfig() {
    const appId = (process.env.WECHAT_APP_ID_weblogin || '').trim()
    const appSecret = (process.env.WECHAT_APP_SECRET_weblogin || '').trim()
    return { appId, appSecret }
}

let oauthClient: OAuth | null = null

function getOAuthClient() {
    if (!oauthClient) {
        const { appId, appSecret } = getWechatLoginConfig()

        if (!appId || !appSecret) {
            console.log('⚠️ [WeChat] 缺少微信登录配置，请检查 WECHAT_APP_ID_weblogin 和 WECHAT_APP_SECRET_weblogin 环境变量')
            return null
        }

        oauthClient = new OAuth(appId, appSecret)
    }

    return oauthClient
}

export const wechatAuth = {
    getAuthUrl: () => {
        const client = getOAuthClient()
        if (!client) {
            throw new Error('WeChat OAuth 客户端未正确初始化，可能处于构建环境中')
        }

        const state = Math.random().toString(36).substring(7)
        return client.getAuthorizeURL(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/wechat/callback`,
            state,
            'snsapi_userinfo'
        )
    },

    getAccessToken: (code: string): Promise<WeChatTokenResult> => {
        const client = getOAuthClient()
        if (!client) {
            throw new Error('WeChat OAuth 客户端未正确初始化，可能处于构建环境中')
        }

        return new Promise((resolve, reject) => {
            client.getAccessToken(code, (err: any, result: WeChatTokenResult) => {
                if (err) reject(err)
                else resolve(result)
            })
        })
    },

    getUserInfo: (openid: string, accessToken: string): Promise<WeChatUserInfo> => {
        const client = getOAuthClient()
        if (!client) {
            throw new Error('WeChat OAuth 客户端未正确初始化，可能处于构建环境中')
        }

        return new Promise((resolve, reject) => {
            client.getUser(openid, accessToken, (err: any, result: WeChatUserInfo) => {
                if (err) reject(err)
                else resolve(result)
            })
        })
    },

    authenticateUser: async (userInfo: WeChatUserInfo) => {
        try {
            const { data: existingUser } = await getSupabaseClient()
                .from('profiles')
                .select('*')
                .eq('wechat_openid', userInfo.openid)
                .single()

            if (existingUser) {
                const { error: sessionError } = await getSupabaseClient().auth.signInWithPassword({
                    email: existingUser.email,
                    password: 'wechat_user_' + userInfo.openid,
                })

                if (sessionError) {
                    throw sessionError
                }

                return { user: existingUser, isNew: false }
            }

            const email = `${userInfo.openid}@wechat.local`
            const password = 'wechat_user_' + userInfo.openid + '_' + Math.random().toString(36).substring(7)

            const { data: authData, error: authError } = await getSupabaseClient().auth.signUp({
                email,
                password,
                options: {
                    data: {
                        provider: 'wechat',
                        wechat_openid: userInfo.openid,
                        wechat_unionid: userInfo.unionid,
                        nickname: userInfo.nickname,
                        avatar_url: userInfo.headimgurl,
                        full_name: userInfo.nickname,
                        city: userInfo.city,
                        province: userInfo.province,
                        country: userInfo.country,
                    },
                },
            })

            if (authError) {
                throw authError
            }

            return { user: authData.user, isNew: true }
        } catch (error) {
            console.error('WeChat authentication error:', error)
            throw error
        }
    },
}
