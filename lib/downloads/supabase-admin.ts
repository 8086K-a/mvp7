import { createClient } from "@supabase/supabase-js"

let supabaseAdminInstance: any = null

export function getSupabaseAdminForDownloads() {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!url || !key) {
      throw new Error("Supabase admin config missing")
    }

    supabaseAdminInstance = createClient(url, key)
  }

  return supabaseAdminInstance
}

export function getSupabaseDownloadBucket() {
  return process.env.SUPABASE_DOWNLOAD_BUCKET || "downloads"
}

export function getSupabaseAdBucket() {
  return process.env.SUPABASE_ADS_BUCKET || process.env.SUPABASE_DOWNLOAD_BUCKET || "downloads"
}

function resolveBucketFileSizeLimit() {
  return String(process.env.SUPABASE_BUCKET_FILE_SIZE_LIMIT || "2048MB").trim() || "2048MB"
}

export async function ensureSupabaseBucketExists(bucket: string, options?: { public?: boolean }) {
  const supabase = getSupabaseAdminForDownloads()
  const isPublic = Boolean(options?.public)

  const { data: existing, error: getError } = await supabase.storage.getBucket(bucket)

  const fileSizeLimit = resolveBucketFileSizeLimit()

  if (!getError && existing) {
    const { error: updateError } = await supabase.storage.updateBucket(bucket, {
      public: isPublic,
      fileSizeLimit,
    })

    if (updateError) {
      const msg = String(updateError?.message || "")
      const isMaxLimitError = msg.toLowerCase().includes("maximum") && msg.toLowerCase().includes("size")
      if (!isMaxLimitError) {
        throw new Error(updateError.message)
      }
    }

    return
  }

  const missing = String(getError?.message || "").toLowerCase().includes("not found") ||
    String(getError?.message || "").toLowerCase().includes("does not exist") ||
    String(getError?.name || "").toLowerCase().includes("storageerror")

  if (!missing && getError) {
    throw new Error(getError.message)
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: isPublic,
    fileSizeLimit,
  })

  if (createError) {
    const conflict = String(createError?.message || "").toLowerCase().includes("already")
    if (!conflict) {
      throw new Error(createError.message)
    }
  }
}
