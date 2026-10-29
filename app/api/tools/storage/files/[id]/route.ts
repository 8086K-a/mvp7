import { NextResponse } from "next/server"
import { deleteStoredFileById, getStoredFileById } from "@/lib/tools/storage"
import { supabaseAdmin } from "@/lib/supabase-admin"

const APP_REGION = process.env.DEPLOYMENT_REGION || "default"
const IS_INTL = APP_REGION === "INTL"
const SUPABASE_BUCKET = "tool-storage-intl"

let cloudbaseApp: any = null

async function getCloudbaseApp() {
  if (cloudbaseApp) return cloudbaseApp
  const tcb = await import("@cloudbase/node-sdk")
  cloudbaseApp = tcb.default.init({
    env: process.env.NEXT_PUBLIC_WECHAT_CLOUDBASE_ID || "",
    secretId: process.env.CLOUDBASE_SECRET_ID || "",
    secretKey: process.env.CLOUDBASE_SECRET_KEY || "",
  })
  return cloudbaseApp
}

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const record = await getStoredFileById(String(id || ""))

    if (!record) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }

    const filePath = `tool-storage/${id}__${record.fileName}`
    let data: Blob

    if (IS_INTL) {
      const result = await supabaseAdmin.storage.from(SUPABASE_BUCKET).download(filePath)
      if (result.error || !result.data) {
        return NextResponse.json({ success: false, error: "Download failed" }, { status: 500 })
      }
      data = result.data
    } else {
      const app = await getCloudbaseApp()
      if (!record.fileID) {
        return NextResponse.json({ success: false, error: "No fileID found" }, { status: 500 })
      }
      try {
        const result = await app.downloadFile({ fileID: record.fileID })
        console.log('Cloudbase download result:', result)
        if (!result || !result.fileContent) {
          return NextResponse.json({ success: false, error: "Download failed: no content" }, { status: 500 })
        }
        data = new Blob([result.fileContent])
      } catch (err: any) {
        console.error('Cloudbase download error:', err)
        return NextResponse.json({ success: false, error: err.message || "Download failed" }, { status: 500 })
      }
    }

    const bytes = new Uint8Array(await data.arrayBuffer())
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(record.fileName)}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to download file" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const ok = await deleteStoredFileById(String(id || ""))

    if (!ok) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}
