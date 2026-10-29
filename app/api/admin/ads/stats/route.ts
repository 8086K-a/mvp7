import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { getAdClickStats } from "@/lib/ads/repository"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const days = Number(request.nextUrl.searchParams.get("days") || 30)
    const stats = await getAdClickStats({ days })
    return NextResponse.json({ success: true, stats })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load ad stats" },
      { status: 500 }
    )
  }
}
