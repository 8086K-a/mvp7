import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { getRecentDownloadEvents } from "@/lib/downloads/repository"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 20)
    const events = await getRecentDownloadEvents(Math.max(1, Math.min(100, limit)))
    return NextResponse.json({ success: true, events })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load download events" },
      { status: 500 }
    )
  }
}
