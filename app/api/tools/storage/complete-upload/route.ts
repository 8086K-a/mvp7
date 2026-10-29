import { NextResponse } from "next/server"
import { completeChunkUpload } from "@/lib/tools/storage"
import { grantReferralFirstUseReward } from "@/lib/market/referrals"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const requestUserId = String(request.headers.get("x-user-id") || "").trim()
    const body = await request.json()
    const uploadId = String(body?.uploadId || "").trim()
    const fileName = String(body?.fileName || "").trim()
    const mimeType = body?.mimeType ? String(body.mimeType) : undefined

    if (!uploadId || !fileName) {
      return NextResponse.json(
        { success: false, error: "uploadId and fileName are required" },
        { status: 400 }
      )
    }

    const file = await completeChunkUpload({ uploadId, fileName, mimeType })

    if (requestUserId) {
      await grantReferralFirstUseReward({
        invitedUserId: requestUserId,
        toolId: "cloud-drive",
      }).catch(() => null)
    }

    return NextResponse.json({ success: true, file })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to complete upload" },
      { status: 500 }
    )
  }
}
