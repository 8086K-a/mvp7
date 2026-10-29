import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { getAdminReferralOverview } from "@/lib/market/referrals"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const overview = await getAdminReferralOverview()
    return NextResponse.json({ success: true, overview })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load market overview" },
      { status: 500 },
    )
  }
}
