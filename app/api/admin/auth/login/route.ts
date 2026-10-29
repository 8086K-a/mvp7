import { NextRequest, NextResponse } from "next/server"
import {
  attachAdminSessionCookie,
  createAdminSessionToken,
  verifyAdminLogin,
} from "@/lib/downloads/admin-auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body?.username || "").trim()
    const password = String(body?.password || "").trim()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "username and password are required" },
        { status: 400 }
      )
    }

    const isValid = verifyAdminLogin({ username, password })
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    const token = createAdminSessionToken(username)
    const response = NextResponse.json({ success: true })
    attachAdminSessionCookie(response, token)
    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Login failed" },
      { status: 500 }
    )
  }
}
