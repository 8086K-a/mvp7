import { NextRequest, NextResponse } from "next/server"
import { DEPLOYMENT_REGION } from "@/lib/config/deployment.config"
import { sendChinaEmailVerificationCode } from "@/lib/auth/china-email-code"

type EmailCodeAction = "signup" | "reset"

export async function POST(request: NextRequest) {
  try {
    if (DEPLOYMENT_REGION !== "CN") {
      return NextResponse.json(
        { error: "Email code endpoint is only available in CN deployment" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const email = String(body?.email || "").trim()
    const action = String(body?.action || "signup") as EmailCodeAction

    if (!email) {
      return NextResponse.json({ error: "请输入邮箱地址" }, { status: 400 })
    }

    if (!["signup", "reset"].includes(action)) {
      return NextResponse.json({ error: "不支持的验证码类型" }, { status: 400 })
    }

    await sendChinaEmailVerificationCode({
      email,
      purpose: action,
    })

    return NextResponse.json({
      success: true,
      message: "验证码已发送，请注意查收",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "发送验证码失败，请稍后重试" },
      { status: 400 }
    )
  }
}
