import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"

const ADMIN_SESSION_COOKIE = "admin_session"

function getAdminJwtSecret() {
  return (
    process.env.ADMIN_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.ADMIN_PANEL_TOKEN ||
    "admin-dev-secret"
  )
}

function getAdminCredentials() {
  const username = String(process.env.ADMIN_USERNAME || "admin").trim()
  const password = String(process.env.ADMIN_PASSWORD || "").trim()
  return { username, password }
}

export function verifyAdminLogin(input: { username?: string; password?: string }) {
  const { username, password } = getAdminCredentials()
  const rawPassword = String(input.password || "").trim()

  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured")
  }

  return String(input.username || "").trim() === username && rawPassword === password
}

export function createAdminSessionToken(username: string) {
  const secret = getAdminJwtSecret()
  return jwt.sign({ sub: username, role: "admin" }, secret, { expiresIn: "7d" })
}

export function decodeAdminSessionToken(token?: string | null): { username: string } | null {
  if (!token) return null

  try {
    const secret = getAdminJwtSecret()
    const payload = jwt.verify(token, secret) as any

    if (payload?.role !== "admin") return null

    return { username: String(payload?.sub || "admin") }
  } catch {
    return null
  }
}

export function attachAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export function readAdminSessionFromRequest(request: NextRequest): { username: string } | null {
  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const payload = decodeAdminSessionToken(cookieToken)
  if (payload) return payload

  const legacyToken = String(request.headers.get("x-admin-token") || "").trim()
  if (legacyToken && legacyToken === String(process.env.ADMIN_PANEL_TOKEN || "").trim()) {
    return { username: "legacy-admin" }
  }

  return null
}

export function verifyAdminToken(request: NextRequest): { ok: true; admin: { username: string } } | { ok: false; response: NextResponse } {
  const session = readAdminSessionFromRequest(request)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { ok: true, admin: session }
}
