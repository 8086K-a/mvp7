import { NextRequest, NextResponse } from "next/server"
import { readAdminSessionFromRequest } from "@/lib/downloads/admin-auth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = readAdminSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ success: true, authenticated: true, admin: session })
}
