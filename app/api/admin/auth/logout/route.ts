import { NextRequest, NextResponse } from "next/server"
import { clearAdminSessionCookie } from "@/lib/downloads/admin-auth"

export const runtime = "nodejs"

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true })
  clearAdminSessionCookie(response)
  return response
}
