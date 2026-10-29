import { supabaseAdmin } from "@/lib/supabase-admin"
import crypto from "crypto"

const APP_REGION = process.env.DEPLOYMENT_REGION || "default"
const IS_INTL = APP_REGION === "INTL"

export interface StoredFileRecord {
  id: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
  fileID?: string
}

const SUPABASE_BUCKET = "tool-storage-intl"

let cloudbaseApp: any = null
let collectionInitialized = false

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

async function ensureCollection() {
  if (collectionInitialized) return
  const app = await getCloudbaseApp()
  const db = app.database()
  try {
    await db.createCollection("tool_files")
  } catch (e: any) {
    // Collection already exists
  }
  collectionInitialized = true
}

export async function saveDirectFile(params: {
  fileName: string
  mimeType?: string
  data: Buffer
}) {
  const fileId = crypto.randomUUID()
  const filePath = `tool-storage/${fileId}__${params.fileName}`
  const record = {
    id: fileId,
    fileName: params.fileName,
    mimeType: params.mimeType || "application/octet-stream",
    size: params.data.length,
    createdAt: new Date().toISOString(),
  }

  if (IS_INTL) {
    const { error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, params.data, {
        contentType: params.mimeType || "application/octet-stream",
        upsert: false,
      })
    if (error) throw new Error(`Upload failed: ${error.message}`)
  } else {
    const app = await getCloudbaseApp()
    await ensureCollection()
    const uploadResult = await app.uploadFile({
      cloudPath: filePath,
      fileContent: params.data,
    })
    record.fileID = uploadResult.fileID
    const db = app.database()
    await db.collection("tool_files").add(record)
  }

  return record
}

export async function listStoredFiles() {
  if (IS_INTL) {
    const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).list("tool-storage")
    if (error) throw new Error(`List failed: ${error.message}`)
    return (data || []).map((file: any) => {
      const [id, ...nameParts] = file.name.split("__")
      return {
        id,
        fileName: nameParts.join("__") || file.name,
        mimeType: "application/octet-stream",
        size: file.metadata?.size || 0,
        createdAt: file.created_at || new Date().toISOString(),
      }
    }).sort((a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1))
  } else {
    const app = await getCloudbaseApp()
    await ensureCollection()
    const db = app.database()
    const res = await db.collection("tool_files").orderBy("createdAt", "desc").get()
    return res.data || []
  }
}

export async function getStoredFileById(id: string) {
  const files = await listStoredFiles()
  return files.find((f) => f.id === id) || null
}

export async function deleteStoredFileById(id: string) {
  const files = await listStoredFiles()
  const file = files.find((f) => f.id === id)
  if (!file) return false

  const filePath = `tool-storage/${id}__${file.fileName}`

  if (IS_INTL) {
    const { error } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).remove([filePath])
    if (error) throw new Error(`Delete failed: ${error.message}`)
  } else {
    const app = await getCloudbaseApp()
    await ensureCollection()
    await app.deleteFile({ fileList: [filePath] })
    const db = app.database()
    await db.collection("tool_files").where({ id }).remove()
  }

  return true
}

