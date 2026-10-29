import { NextRequest, NextResponse } from 'next/server'
import { wechatAuth } from '@/lib/wechat-auth'

export async function GET(request: NextRequest) {
    try {
        const authUrl = wechatAuth.getAuthUrl()
        return NextResponse.redirect(authUrl)
    } catch (error) {
        console.error('WeChat auth error:', error)
        return NextResponse.json(
            { error: 'WeChat OAuth not configured properly' },
            { status: 500 }
        )
    }
}
