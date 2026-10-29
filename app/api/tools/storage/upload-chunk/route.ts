import { NextResponse } from "next/server"
import { saveChunk } from "@/lib/tools/storage"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const chunk = formData.get("chunk")
    const uploadId = String(formData.get("uploadId") || "").trim()
    const chunkIndex = Number(formData.get("chunkIndex"))

    if (!(chunk instanceof File) || !uploadId || !Number.isFinite(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid chunk/upload metadata" },
        { status: 400 }
      )
    }

    const data = Buffer.from(await chunk.arrayBuffer())
    await saveChunk({ uploadId, chunkIndex, chunkData: data })

    return NextResponse.json({ success: true, uploadId, chunkIndex })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload chunk" },
      { status: 500 }
    )
  }
}

