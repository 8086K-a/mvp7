import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { getAdminDashboardStats } from "@/lib/downloads/repository"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const stats = await getAdminDashboardStats()
    return NextResponse.json({ success: true, stats })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load stats" },
      { status: 500 }
    )
  }
}
