import { NextResponse } from "next/server"
import { listStoredFiles, saveDirectFile } from "@/lib/tools/storage"
import { grantReferralFirstUseReward } from "@/lib/market/referrals"

export const runtime = "nodejs"

export async function GET() {
  try {
    const files = await listStoredFiles()
    return NextResponse.json({ success: true, files })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list files" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const requestUserId = String(request.headers.get("x-user-id") || "").trim()
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 }
      )
    }

    const data = Buffer.from(await file.arrayBuffer())
    const saved = await saveDirectFile({
      fileName: file.name || "file.bin",
      mimeType: file.type || "application/octet-stream",
      data,
    })

    if (requestUserId) {
      await grantReferralFirstUseReward({
        invitedUserId: requestUserId,
        toolId: "cloud-drive",
      }).catch(() => null)
    }

    return NextResponse.json({ success: true, file: saved })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}
