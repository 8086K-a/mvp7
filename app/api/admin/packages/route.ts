import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { uploadToCloudbaseStorage } from "@/lib/downloads/cloudbase-storage"
import {
  createDownloadPackage,
  listAllDownloadPackagesForAdmin,
} from "@/lib/downloads/repository"
import { ensureSupabaseBucketExists, getSupabaseAdminForDownloads, getSupabaseDownloadBucket } from "@/lib/downloads/supabase-admin"
import { PackageRegion } from "@/lib/downloads/types"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): PackageRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

function getIntlUploadMaxBytes() {
  const raw = Number(process.env.SUPABASE_UPLOAD_MAX_MB || 50)
  const maxMb = Number.isFinite(raw) && raw > 0 ? raw : 50
  return Math.floor(maxMb * 1024 * 1024)
}

async function uploadToSupabaseStorage(input: { file: File }) {
  const supabase = getSupabaseAdminForDownloads()
  const bucket = getSupabaseDownloadBucket()
  await ensureSupabaseBucketExists(bucket, { public: false })

  const maxBytes = getIntlUploadMaxBytes()
  if (input.file.size > maxBytes) {
    const fileSizeMb = (input.file.size / 1024 / 1024).toFixed(2)
    const maxMb = (maxBytes / 1024 / 1024).toFixed(0)
    throw new Error(`上传失败：安装包 ${fileSizeMb}MB 超过当前国际版上限 ${maxMb}MB。请压缩安装包或提升 Supabase 计划限制。`)
  }

  const fileName = input.file.name || `package_${Date.now()}`
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const objectPath = `downloads/${Date.now()}_${safeName}`
  const buffer = Buffer.from(await input.file.arrayBuffer())

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  })

  if (error) {
    const rawMessage = String(error.message || "")
    const isObjectTooLarge =
      rawMessage.toLowerCase().includes("exceeded the maximum allowed size") ||
      rawMessage.toLowerCase().includes("maximum allowed size")

    if (isObjectTooLarge) {
      const fileSizeMb = (input.file.size / 1024 / 1024).toFixed(2)
      throw new Error(`上传失败：文件 ${fileName} (${fileSizeMb}MB) 超过 Supabase bucket(${bucket}) 大小限制。请在 Supabase Storage 提高 bucket 的 File size limit。`)
    }

    throw new Error(rawMessage)
  }

  return objectPath
}

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const packages = await listAllDownloadPackagesForAdmin()
    return NextResponse.json({ success: true, packages })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list packages" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const formData = await request.formData()
    const region = normalizeRegion(String(formData.get("region") || ""))
    const platform = String(formData.get("platform") || "").trim()
    const version = String(formData.get("version") || "").trim()
    const title = `Morntool ${platform || "package"}`
    const releaseNotes = String(formData.get("releaseNotes") || "").trim()
    const isActive = String(formData.get("isActive") || "true") !== "false"
    const fileValue = formData.get("file")

    if (!platform || !version || !(fileValue instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: region/platform/version/file" },
        { status: 400 }
      )
    }

    let storagePath = ""
    let storageProvider: "cloudbase" | "supabase" = "cloudbase"

    if (region === "INTL") {
      storagePath = await uploadToSupabaseStorage({ file: fileValue })
      storageProvider = "supabase"
    } else {
      const upload = await uploadToCloudbaseStorage({
        fileName: fileValue.name,
        data: Buffer.from(await fileValue.arrayBuffer()),
        mimeType: fileValue.type,
      })
      storagePath = upload.fileID
      storageProvider = "cloudbase"
    }

    const pkg = await createDownloadPackage({
      region,
      platform,
      version,
      title,
      fileName: fileValue.name,
      fileSize: fileValue.size,
      mimeType: fileValue.type || "application/octet-stream",
      releaseNotes: releaseNotes || null,
      isActive,
      storageProvider,
      storagePath,
    })

    return NextResponse.json({ success: true, package: pkg })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload package" },
      { status: 500 }
    )
  }
}
