import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase, downloadFileFromCloudBase } from "@/lib/database/cloudbase-service"
import { deleteFromCloudbaseStorage } from "@/lib/downloads/cloudbase-storage"
import { ensureSupabaseBucketExists, getSupabaseAdminForDownloads, getSupabaseDownloadBucket } from "@/lib/downloads/supabase-admin"
import {
  CreateDownloadPackageInput,
  DownloadEventInput,
  DownloadPackageRecord,
  PackageRegion,
} from "@/lib/downloads/types"

function normalizeRegion(value?: string | null): PackageRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

function mapSupabasePackage(row: any): DownloadPackageRecord {
  return {
    id: String(row.id),
    region: normalizeRegion(row.region),
    platform: String(row.platform || "unknown"),
    version: String(row.version || "0.0.0"),
    title: String(row.title || "Installer"),
    fileName: String(row.file_name || "package.bin"),
    fileSize: Number(row.file_size || 0),
    mimeType: String(row.mime_type || "application/octet-stream"),
    releaseNotes: row.release_notes || null,
    isActive: Boolean(row.is_active),
    downloadCount: Number(row.download_count || 0),
    storageProvider: "supabase",
    storagePath: String(row.file_path || ""),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

function mapCloudbasePackage(row: any): DownloadPackageRecord {
  return {
    id: String(row._id || row.id),
    region: normalizeRegion(row.region),
    platform: String(row.platform || "unknown"),
    version: String(row.version || "0.0.0"),
    title: String(row.title || "Installer"),
    fileName: String(row.file_name || "package.bin"),
    fileSize: Number(row.file_size || 0),
    mimeType: String(row.mime_type || "application/octet-stream"),
    releaseNotes: row.release_notes || null,
    isActive: Boolean(row.is_active),
    downloadCount: Number(row.download_count || 0),
    storageProvider: "cloudbase",
    storagePath: String(row.file_path || ""),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

async function ensureCloudbaseCollections(db: any) {
  for (const name of ["download_packages", "download_events"]) {
    try {
      await db.collection(name).limit(1).get()
    } catch (error: any) {
      const msg = String(error?.message || "")
      if (msg.includes("Db or Table not exist") || msg.includes("DATABASE_COLLECTION_NOT_EXIST")) {
        await db.createCollection(name)
      } else {
        throw error
      }
    }
  }
}

export async function createDownloadPackage(input: CreateDownloadPackageInput): Promise<DownloadPackageRecord> {
  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { data: existingRows, error: existingError } = await supabase
      .from("download_packages")
      .select("*")
      .eq("region", "INTL")
      .eq("platform", input.platform)
      .order("created_at", { ascending: false })

    if (existingError) {
      throw new Error(existingError.message)
    }

    const primary = Array.isArray(existingRows) ? existingRows[0] : null

    let data: any = null
    let error: any = null

    if (primary?.id) {
      const updateResult = await supabase
        .from("download_packages")
        .update({
          version: input.version,
          title: input.title,
          file_name: input.fileName,
          file_size: input.fileSize,
          mime_type: input.mimeType,
          release_notes: input.releaseNotes || null,
          is_active: input.isActive !== false,
          storage_provider: "supabase",
          file_path: input.storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", primary.id)
        .select("*")
        .single()

      data = updateResult.data
      error = updateResult.error
    } else {
      const insertResult = await supabase
        .from("download_packages")
        .insert({
          region: "INTL",
          platform: input.platform,
          version: input.version,
          title: input.title,
          file_name: input.fileName,
          file_size: input.fileSize,
          mime_type: input.mimeType,
          release_notes: input.releaseNotes || null,
          is_active: input.isActive !== false,
          storage_provider: "supabase",
          file_path: input.storagePath,
        })
        .select("*")
        .single()

      data = insertResult.data
      error = insertResult.error
    }

    if (error || !data) {
      throw new Error(error?.message || "Failed to create package")
    }

    return mapSupabasePackage(data)
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  const now = new Date().toISOString()

  const existingResult = await db
    .collection("download_packages")
    .where({ region: "CN", platform: input.platform })
    .get()
  const existingRows = Array.isArray(existingResult?.data) ? existingResult.data : []
  const primary = existingRows.sort((a: any, b: any) => {
    const aTime = String(a?.updated_at || a?.created_at || "")
    const bTime = String(b?.updated_at || b?.created_at || "")
    return aTime > bTime ? -1 : 1
  })[0]

  const payload = {
    region: "CN",
    platform: input.platform,
    version: input.version,
    title: input.title,
    file_name: input.fileName,
    file_size: input.fileSize,
    mime_type: input.mimeType,
    release_notes: input.releaseNotes || null,
    is_active: input.isActive !== false,
    download_count: 0,
    storage_provider: "cloudbase",
    file_path: input.storagePath,
    created_at: now,
    updated_at: now,
  }

  let row: any

  if (primary?._id) {
    await db.collection("download_packages").doc(primary._id).update({
      version: payload.version,
      title: payload.title,
      file_name: payload.file_name,
      file_size: payload.file_size,
      mime_type: payload.mime_type,
      release_notes: payload.release_notes,
      is_active: payload.is_active,
      storage_provider: payload.storage_provider,
      file_path: payload.file_path,
      updated_at: now,
    })

    const updated = await db.collection("download_packages").where({ _id: primary._id }).get()
    row = updated?.data?.[0] || { ...primary, ...payload, _id: primary._id }
  } else {
    const result = await db.collection("download_packages").add(payload)
    const listResult = await db.collection("download_packages").where({ _id: result.id }).get()
    row = listResult?.data?.[0] || { ...payload, _id: result.id }
  }

  return mapCloudbasePackage(row)
}

export async function listDownloadPackages(options?: {
  region?: PackageRegion
  onlyActive?: boolean
}): Promise<DownloadPackageRecord[]> {
  const region = options?.region
  const onlyActive = options?.onlyActive !== false

  if (region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    let query = supabase.from("download_packages").select("*").eq("region", "INTL")
    if (onlyActive) query = query.eq("is_active", true)
    query = query.order("created_at", { ascending: false })
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map(mapSupabasePackage)
  }

  if (region === "CN") {
    const db = await getDatabase()
    await ensureCloudbaseCollections(db)
    let query = db.collection("download_packages").where({ region: "CN" })
    if (onlyActive) {
      query = db.collection("download_packages").where({ region: "CN", is_active: true })
    }
    const result = await query.get()
    const records = (result?.data || []).map(mapCloudbasePackage)
    return records.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
  }

  const current = resolveDeploymentRegion()
  return listDownloadPackages({ region: current, onlyActive })
}

export async function listAllDownloadPackagesForAdmin(): Promise<DownloadPackageRecord[]> {
  const [cn, intl] = await Promise.all([
    listDownloadPackages({ region: "CN", onlyActive: false }).catch(() => []),
    listDownloadPackages({ region: "INTL", onlyActive: false }).catch(() => []),
  ])

  return [...cn, ...intl].sort((a: DownloadPackageRecord, b: DownloadPackageRecord) =>
    a.createdAt > b.createdAt ? -1 : 1
  )
}

export async function updatePackageActive(input: {
  id: string
  region: PackageRegion
  isActive: boolean
}): Promise<void> {
  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { error } = await supabase
      .from("download_packages")
      .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
      .eq("id", input.id)
    if (error) throw new Error(error.message)
    return
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  await db.collection("download_packages").doc(input.id).update({
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  })
}

export async function deletePackageById(input: {
  id: string
  region: PackageRegion
}): Promise<void> {
  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const bucket = getSupabaseDownloadBucket()

    const { data: existing, error: loadError } = await supabase
      .from("download_packages")
      .select("id,file_path")
      .eq("id", input.id)
      .eq("region", "INTL")
      .maybeSingle()

    if (loadError) throw new Error(loadError.message)

    if (existing?.file_path) {
      await supabase.storage.from(bucket).remove([String(existing.file_path)])
    }

    const { error } = await supabase
      .from("download_packages")
      .delete()
      .eq("id", input.id)
      .eq("region", "INTL")

    if (error) throw new Error(error.message)
    return
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)

  const existingResult = await db.collection("download_packages").where({ _id: input.id, region: "CN" }).get()
  const existing = existingResult?.data?.[0]

  if (existing?.file_path) {
    try {
      await deleteFromCloudbaseStorage(String(existing.file_path))
    } catch {
      // ignore storage deletion errors, still delete DB record
    }
  }

  await db.collection("download_packages").doc(input.id).remove()
}

export async function getPackageById(id: string, region?: PackageRegion): Promise<DownloadPackageRecord | null> {
  const regionToUse = region || resolveDeploymentRegion()

  if (regionToUse === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { data, error } = await supabase
      .from("download_packages")
      .select("*")
      .eq("id", id)
      .eq("region", "INTL")
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? mapSupabasePackage(data) : null
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  const result = await db.collection("download_packages").where({ _id: id, region: "CN" }).get()
  const row = result?.data?.[0]
  return row ? mapCloudbasePackage(row) : null
}

export async function recordDownloadEvent(input: DownloadEventInput): Promise<void> {
  const now = new Date().toISOString()

  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()

    const { data: existing, error: loadError } = await supabase
      .from("download_packages")
      .select("download_count")
      .eq("id", input.packageId)
      .maybeSingle()

    if (loadError) throw new Error(loadError.message)

    const currentCount = Number(existing?.download_count || 0)
    const { error: updateError } = await supabase
      .from("download_packages")
      .update({
        download_count: currentCount + 1,
        updated_at: now,
      })
      .eq("id", input.packageId)

    if (updateError) throw new Error(updateError.message)

    const { error: eventError } = await supabase.from("download_events").insert({
      package_id: input.packageId,
      region: "INTL",
      user_id: input.userId || null,
      user_email: input.userEmail || null,
      ip: input.ip || null,
      user_agent: input.userAgent || null,
      created_at: now,
    })
    if (eventError) throw new Error(eventError.message)

    return
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)

  const packageResult = await db.collection("download_packages").where({ _id: input.packageId }).get()
  const pkg = packageResult?.data?.[0]
  const currentCount = Number(pkg?.download_count || 0)

  await db.collection("download_packages").doc(input.packageId).update({
    download_count: currentCount + 1,
    updated_at: now,
  })

  await db.collection("download_events").add({
    package_id: input.packageId,
    region: "CN",
    user_id: input.userId || null,
    user_email: input.userEmail || null,
    ip: input.ip || null,
    user_agent: input.userAgent || null,
    created_at: now,
  })
}

export async function getSupabaseSignedDownloadUrl(filePath: string): Promise<string> {
  const bucket = getSupabaseDownloadBucket()
  await ensureSupabaseBucketExists(bucket, { public: false })
  const supabase = getSupabaseAdminForDownloads()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60)
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to create signed url")
  }

  return data.signedUrl
}

export async function downloadCloudbasePackageFile(fileID: string): Promise<Buffer> {
  return downloadFileFromCloudBase(fileID)
}

export async function getDownloadStatsSummary() {
  const [allPackages, cnUsers, intlUsers] = await Promise.all([
    listAllDownloadPackagesForAdmin(),
    countChinaUsers().catch(() => 0),
    countIntlUsers().catch(() => 0),
  ])

  const totalDownloads = allPackages.reduce((sum, item) => sum + Number(item.downloadCount || 0), 0)
  const cnPackages = allPackages.filter((item) => item.region === "CN").length
  const intlPackages = allPackages.filter((item) => item.region === "INTL").length

  return {
    totalUsers: cnUsers + intlUsers,
    cnUsers,
    intlUsers,
    totalDownloads,
    totalPackages: allPackages.length,
    cnPackages,
    intlPackages,
  }
}

async function countIntlUsers(): Promise<number> {
  const supabase = getSupabaseAdminForDownloads()
  const { count, error } = await supabase
    .from("user")
    .select("id", { count: "exact", head: true })

  if (error) {
    throw new Error(error.message)
  }

  return Number(count || 0)
}

async function countChinaUsers(): Promise<number> {
  const db = await getDatabase()
  const result = await db.collection("web_users").get()
  return Array.isArray(result?.data) ? result.data.length : 0
}

export async function getAdminDashboardStats() {
  const nowIso = new Date().toISOString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartIso = todayStart.toISOString()

  const [downloadStats, cnMetrics, intlMetrics] = await Promise.all([
    getDownloadStatsSummary(),
    getCnBusinessMetrics(todayStartIso, nowIso).catch(() => ({
      totalUsers: 0,
      paidUsers: 0,
      activeMembers: 0,
      completedOrders: 0,
      revenue: 0,
      todayNewUsers: 0,
    })),
    getIntlBusinessMetrics(todayStartIso, nowIso).catch(() => ({
      totalUsers: 0,
      paidUsers: 0,
      activeMembers: 0,
      completedOrders: 0,
      revenue: 0,
      todayNewUsers: 0,
    })),
  ])

  return {
    overview: {
      totalUsers: cnMetrics.totalUsers + intlMetrics.totalUsers,
      paidUsers: cnMetrics.paidUsers + intlMetrics.paidUsers,
      activeMembers: cnMetrics.activeMembers + intlMetrics.activeMembers,
      completedOrders: cnMetrics.completedOrders + intlMetrics.completedOrders,
      totalRevenueCny: Number(cnMetrics.revenue.toFixed(2)),
      totalRevenueUsd: Number(intlMetrics.revenue.toFixed(2)),
      totalDownloads: downloadStats.totalDownloads,
      todayNewUsers: cnMetrics.todayNewUsers + intlMetrics.todayNewUsers,
    },
    cn: cnMetrics,
    intl: intlMetrics,
    downloads: downloadStats,
  }
}

export async function getRecentAdminUsers(limit = 20) {
  const [cnUsers, intlUsers] = await Promise.all([
    getCnUsers().catch(() => []),
    getIntlUsers(limit).catch(() => []),
  ])

  return [...cnUsers, ...intlUsers]
    .sort((a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, limit)
}

export async function getRecentAdminOrders(limit = 20) {
  const [cnOrders, intlOrders] = await Promise.all([
    getCnOrders().catch(() => []),
    getIntlOrders(limit).catch(() => []),
  ])

  return [...cnOrders, ...intlOrders]
    .sort((a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, limit)
}

export async function getRecentDownloadEvents(limit = 20) {
  const [cnEvents, intlEvents] = await Promise.all([
    getCnDownloadEvents().catch(() => []),
    getIntlDownloadEvents(limit).catch(() => []),
  ])

  return [...cnEvents, ...intlEvents]
    .sort((a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, limit)
}

async function getCnBusinessMetrics(todayStartIso: string, nowIso: string) {
  const db = await getDatabase()

  const usersResult = await db.collection("web_users").get()
  const users = Array.isArray(usersResult?.data) ? usersResult.data : []

  const paidUsers = users.filter((item: any) => Boolean(item?.pro) || String(item?.subscription_tier || "") !== "free").length
  const activeMembers = users.filter((item: any) => {
    const raw = item?.subscription_expires_at || item?.membership_expires_at
    if (!raw) return false
    const expire = new Date(raw).toISOString()
    return expire > nowIso
  }).length

  const todayNewUsers = users.filter((item: any) => {
    const created = item?.createdAt || item?.created_at
    if (!created) return false
    return String(created) >= todayStartIso
  }).length

  const paymentResult = await db.collection("payments").where({ status: "completed" }).get()
  const payments = Array.isArray(paymentResult?.data) ? paymentResult.data : []
  const revenue = payments.reduce((sum: number, item: any) => sum + Number(item?.amount_cny || item?.amount || 0), 0)

  return {
    totalUsers: users.length,
    paidUsers,
    activeMembers,
    completedOrders: payments.length,
    revenue: Number(revenue.toFixed(2)),
    todayNewUsers,
  }
}

async function getIntlBusinessMetrics(todayStartIso: string, nowIso: string) {
  const supabase = getSupabaseAdminForDownloads()

  const [usersCount, paidCount, activeCount, orderCount, revenueRows, todayUsersCount] = await Promise.all([
    supabase.from("user").select("id", { count: "exact", head: true }),
    supabase.from("user").select("id", { count: "exact", head: true }).neq("subscription_tier", "free"),
    supabase.from("user").select("id", { count: "exact", head: true }).gt("subscription_expires_at", nowIso),
    supabase.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("payment_transactions").select("amount_usd").eq("status", "completed"),
    supabase.from("user").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso),
  ])

  const totalUsers = Number(usersCount.count || 0)
  const paidUsers = Number(paidCount.count || 0)
  const activeMembers = Number(activeCount.count || 0)
  const completedOrders = Number(orderCount.count || 0)
  const todayNewUsers = Number(todayUsersCount.count || 0)

  const revenue = Array.isArray(revenueRows.data)
    ? revenueRows.data.reduce((sum: number, item: any) => sum + Number(item?.amount_usd || 0), 0)
    : 0

  return {
    totalUsers,
    paidUsers,
    activeMembers,
    completedOrders,
    revenue: Number(revenue.toFixed(2)),
    todayNewUsers,
  }
}

async function getCnUsers() {
  const db = await getDatabase()
  const result = await db.collection("web_users").get()
  const rows = Array.isArray(result?.data) ? result.data : []

  return rows.map((row: any) => ({
    id: String(row?._id || ""),
    email: String(row?.email || ""),
    region: "CN",
    subscriptionTier: String(row?.subscription_tier || (row?.pro ? "pro" : "free")),
    credits: Number(row?.credits || 0),
    createdAt: String(row?.createdAt || row?.created_at || new Date().toISOString()),
  }))
}

async function getIntlUsers(limit = 20) {
  const supabase = getSupabaseAdminForDownloads()
  const { data, error } = await supabase
    .from("user")
    .select("id,email,subscription_tier,credits,created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: String(row?.id || ""),
    email: String(row?.email || ""),
    region: "INTL",
    subscriptionTier: String(row?.subscription_tier || "free"),
    credits: Number(row?.credits || 0),
    createdAt: String(row?.created_at || new Date().toISOString()),
  }))
}

async function getCnOrders() {
  const db = await getDatabase()
  const result = await db.collection("payments").get()
  const rows = Array.isArray(result?.data) ? result.data : []

  return rows.map((row: any) => ({
    id: String(row?._id || row?.out_trade_no || ""),
    region: "CN",
    method: String(row?.payment_method || "wechat"),
    status: String(row?.status || "pending"),
    amount: Number(row?.amount_cny || row?.amount || 0),
    currency: "CNY",
    userEmail: String(row?.user_email || ""),
    createdAt: String(row?.created_at || new Date().toISOString()),
  }))
}

async function getIntlOrders(limit = 20) {
  const supabase = getSupabaseAdminForDownloads()
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("id,payment_method,status,amount_usd,user_email,created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: String(row?.id || ""),
    region: "INTL",
    method: String(row?.payment_method || "stripe"),
    status: String(row?.status || "pending"),
    amount: Number(row?.amount_usd || 0),
    currency: "USD",
    userEmail: String(row?.user_email || ""),
    createdAt: String(row?.created_at || new Date().toISOString()),
  }))
}

async function getCnDownloadEvents() {
  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  const result = await db.collection("download_events").get()
  const rows = Array.isArray(result?.data) ? result.data : []

  return rows.map((row: any) => ({
    id: String(row?._id || ""),
    region: "CN",
    packageId: String(row?.package_id || ""),
    userEmail: String(row?.user_email || ""),
    ip: String(row?.ip || ""),
    createdAt: String(row?.created_at || new Date().toISOString()),
  }))
}

async function getIntlDownloadEvents(limit = 20) {
  const supabase = getSupabaseAdminForDownloads()
  const { data, error } = await supabase
    .from("download_events")
    .select("id,package_id,user_email,ip,created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: String(row?.id || ""),
    region: "INTL",
    packageId: String(row?.package_id || ""),
    userEmail: String(row?.user_email || ""),
    ip: String(row?.ip || ""),
    createdAt: String(row?.created_at || new Date().toISOString()),
  }))
}
