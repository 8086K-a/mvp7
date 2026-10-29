import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { uploadToCloudbaseStorage } from "@/lib/downloads/cloudbase-storage"
import { ensureSupabaseBucketExists, getSupabaseAdBucket, getSupabaseAdminForDownloads } from "@/lib/downloads/supabase-admin"
import type { AdRegion } from "@/lib/ads/repository"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): AdRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

async function uploadToSupabase(input: { file: File }) {
  const supabase = getSupabaseAdminForDownloads()
  const bucket = getSupabaseAdBucket()
  await ensureSupabaseBucketExists(bucket, { public: true })

  const safeName = String(input.file.name || `ad_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_")
  const objectPath = `ads/${Date.now()}_${safeName}`
  const buffer = Buffer.from(await input.file.arrayBuffer())

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath)
  return {
    imageUrl: data?.publicUrl || objectPath,
    storagePath: objectPath,
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const formData = await request.formData()
    const region = normalizeRegion(String(formData.get("region") || ""))
    const fileValue = formData.get("file")

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ success: false, error: "请选择图片文件" }, { status: 400 })
    }

    if (!String(fileValue.type || "").startsWith("image/")) {
      return NextResponse.json({ success: false, error: "仅支持图片文件上传" }, { status: 400 })
    }

    if (fileValue.size > 8 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "图片过大，请压缩到 8MB 以内" }, { status: 400 })
    }

    if (region === "INTL") {
      const uploaded = await uploadToSupabase({ file: fileValue })
      return NextResponse.json({
        success: true,
        imageUrl: uploaded.imageUrl,
        storagePath: uploaded.storagePath,
      })
    }

    const upload = await uploadToCloudbaseStorage({
      fileName: fileValue.name,
      data: Buffer.from(await fileValue.arrayBuffer()),
      mimeType: fileValue.type,
      directory: "ads",
    })

    return NextResponse.json({
      success: true,
      imageUrl: upload.fileID,
      storagePath: upload.fileID,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload ad image" },
      { status: 500 }
    )
  }
}
