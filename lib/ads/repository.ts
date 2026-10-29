import { getDatabase } from "@/lib/database/cloudbase-service"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { deleteFromCloudbaseStorage, getCloudbaseTempFileURL } from "@/lib/downloads/cloudbase-storage"
import { getSupabaseAdBucket, getSupabaseAdminForDownloads } from "@/lib/downloads/supabase-admin"
import { normalizeAdPlacement, type AdPlacement } from "@/lib/ads/placements"

export type AdRegion = "CN" | "INTL"

export interface AdRecord {
  id: string
  region: AdRegion
  title: string
  imageUrl: string
  linkUrl: string
  placement: string
  isActive: boolean
  sortOrder: number
  clickCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateAdInput {
  region: AdRegion
  title: string
  imageUrl: string
  linkUrl: string
  placement?: string
  isActive?: boolean
  sortOrder?: number
}

export interface RecordAdClickInput {
  adId: string
  region: AdRegion
  placement: string
  ip?: string | null
  userAgent?: string | null
}

export interface AdClickStats {
  totalClicks: number
  clicksByRegion: {
    CN: number
    INTL: number
  }
  clicksByPlacement: Record<string, number>
  clicksByAd: Record<string, number>
  recentDaily: Array<{ date: string; clicks: number }>
}

function normalizeRegion(value?: string | null): AdRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

function mapSupabaseAd(row: any): AdRecord {
  return {
    id: String(row.id),
    region: normalizeRegion(row.region),
    title: String(row.title || ""),
    imageUrl: String(row.image_url || ""),
    linkUrl: String(row.link_url || ""),
    placement: String(row.placement || "dashboard_top"),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

function mapCloudbaseAd(row: any): AdRecord {
  return {
    id: String(row._id || row.id),
    region: normalizeRegion(row.region),
    title: String(row.title || ""),
    imageUrl: String(row.image_url || ""),
    linkUrl: String(row.link_url || ""),
    placement: String(row.placement || "dashboard_top"),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

function isCloudbaseFileId(value: string) {
  return value.startsWith("cloud://")
}

function parseSupabasePublicObjectPath(input: string): string | null {
  if (!input) return null
  const bucket = getSupabaseAdBucket()

  if (!input.startsWith("http")) {
    return input
  }

  const marker = `/storage/v1/object/public/${bucket}/`
  const index = input.indexOf(marker)
  if (index < 0) return null

  const encodedPath = input.slice(index + marker.length)
  return decodeURIComponent(encodedPath.split("?")[0] || "") || null
}

function toDateKey(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return input.slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

function getRecentDateKeys(days = 7) {
  const keys: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setUTCDate(now.getUTCDate() - i)
    keys.push(date.toISOString().slice(0, 10))
  }
  return keys
}

async function hydrateCloudbaseImageUrls(rows: AdRecord[]): Promise<AdRecord[]> {
  const tasks = rows.map(async (row) => {
    if (!isCloudbaseFileId(row.imageUrl)) {
      return row
    }

    try {
      const tempUrl = await getCloudbaseTempFileURL(row.imageUrl)
      return {
        ...row,
        imageUrl: tempUrl,
      }
    } catch {
      return row
    }
  })

  return Promise.all(tasks)
}

async function ensureCloudbaseCollections(db: any) {
  for (const name of ["web_ads", "web_ad_clicks"]) {
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

export function validatePlacement(value?: string | null): AdPlacement {
  return normalizeAdPlacement(value)
}

export async function listAds(options?: {
  region?: AdRegion
  onlyActive?: boolean
  placement?: string
}): Promise<AdRecord[]> {
  const region = options?.region || resolveDeploymentRegion()
  const onlyActive = options?.onlyActive !== false
  const placement = String(options?.placement || "dashboard_top").trim()

  if (region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    let query = supabase.from("web_ads").select("*").eq("region", "INTL")
    if (onlyActive) query = query.eq("is_active", true)
    if (placement) query = query.eq("placement", placement)
    query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false })

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map(mapSupabaseAd)
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)

  const whereQuery: Record<string, any> = { region: "CN" }
  if (onlyActive) whereQuery.is_active = true
  if (placement) whereQuery.placement = placement

  const result = await db.collection("web_ads").where(whereQuery).get()
  const rows = (result?.data || []).map(mapCloudbaseAd)
  const sorted = rows.sort((a, b) =>
    a.sortOrder === b.sortOrder ? (a.createdAt > b.createdAt ? -1 : 1) : a.sortOrder - b.sortOrder
  )

  return hydrateCloudbaseImageUrls(sorted)
}

export async function listAllAdsForAdmin(): Promise<AdRecord[]> {
  const [cn, intl] = await Promise.all([
    listAds({ region: "CN", onlyActive: false, placement: "" }).catch(() => []),
    listAds({ region: "INTL", onlyActive: false, placement: "" }).catch(() => []),
  ])

  const allAds = [...cn, ...intl].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
  const stats = await getAdClickStats({ days: 365 }).catch(() => null)

  if (!stats) return allAds

  return allAds.map((ad) => ({
    ...ad,
    clickCount: Number(stats.clicksByAd[ad.id] || 0),
  }))
}

export async function createAd(input: CreateAdInput): Promise<AdRecord> {
  const payload = {
    region: input.region,
    title: input.title,
    image_url: input.imageUrl,
    link_url: input.linkUrl,
    placement: validatePlacement(input.placement),
    is_active: input.isActive !== false,
    sort_order: Number(input.sortOrder || 0),
    updated_at: new Date().toISOString(),
  }

  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { data, error } = await supabase
      .from("web_ads")
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select("*")
      .single()

    if (error || !data) throw new Error(error?.message || "Failed to create ad")
    return mapSupabaseAd(data)
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  const result = await db.collection("web_ads").add({ ...payload, created_at: new Date().toISOString() })
  const rowResult = await db.collection("web_ads").where({ _id: result.id }).get()
  const row = rowResult?.data?.[0]
  return mapCloudbaseAd(row || { ...payload, _id: result.id })
}

export async function updateAdStatus(input: { id: string; region: AdRegion; isActive: boolean }) {
  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { error } = await supabase
      .from("web_ads")
      .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .eq("region", "INTL")

    if (error) throw new Error(error.message)
    return
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  await db.collection("web_ads").doc(input.id).update({
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteAd(input: { id: string; region: AdRegion }) {
  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const bucket = getSupabaseAdBucket()

    const { data: existing, error: findError } = await supabase
      .from("web_ads")
      .select("id,image_url")
      .eq("id", input.id)
      .eq("region", "INTL")
      .maybeSingle()

    if (findError) throw new Error(findError.message)

    const objectPath = parseSupabasePublicObjectPath(String(existing?.image_url || ""))
    if (objectPath) {
      await supabase.storage.from(bucket).remove([objectPath])
    }

    await supabase.from("web_ad_clicks").delete().eq("ad_id", input.id).eq("region", "INTL")

    const { error } = await supabase.from("web_ads").delete().eq("id", input.id).eq("region", "INTL")
    if (error) throw new Error(error.message)
    return
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)

  const existingResult = await db.collection("web_ads").where({ _id: input.id, region: "CN" }).get()
  const existing = existingResult?.data?.[0]
  const imageUrl = String(existing?.image_url || "")
  if (isCloudbaseFileId(imageUrl)) {
    try {
      await deleteFromCloudbaseStorage(imageUrl)
    } catch {
      // ignore storage deletion failures
    }
  }

  await db.collection("web_ad_clicks").where({ ad_id: input.id, region: "CN" }).remove()
  await db.collection("web_ads").doc(input.id).remove()
}

export async function recordAdClick(input: RecordAdClickInput): Promise<void> {
  const payload = {
    ad_id: input.adId,
    region: input.region,
    placement: validatePlacement(input.placement),
    ip: input.ip || null,
    user_agent: input.userAgent || null,
    created_at: new Date().toISOString(),
  }

  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { error } = await supabase.from("web_ad_clicks").insert(payload)
    if (error) throw new Error(error.message)
    return
  }

  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  await db.collection("web_ad_clicks").add(payload)
}

export async function getAdClickStats(options?: { days?: number }): Promise<AdClickStats> {
  const days = Number(options?.days || 30)
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - Math.max(1, days) + 1)
  const sinceIso = since.toISOString()

  const [intlRows, cnRows] = await Promise.all([
    getIntlAdClicksSince(sinceIso).catch(() => []),
    getCnAdClicksSince(sinceIso).catch(() => []),
  ])

  const rows = [...intlRows, ...cnRows]
  const clicksByPlacement: Record<string, number> = {}
  const clicksByAd: Record<string, number> = {}
  const clicksByDate: Record<string, number> = {}

  let cnCount = 0
  let intlCount = 0

  for (const row of rows) {
    const region = normalizeRegion(row.region)
    const placement = validatePlacement(row.placement)
    const adId = String(row.ad_id || "")
    const dateKey = toDateKey(String(row.created_at || ""))

    if (region === "INTL") intlCount += 1
    else cnCount += 1

    clicksByPlacement[placement] = Number(clicksByPlacement[placement] || 0) + 1

    if (adId) {
      clicksByAd[adId] = Number(clicksByAd[adId] || 0) + 1
    }

    if (dateKey) {
      clicksByDate[dateKey] = Number(clicksByDate[dateKey] || 0) + 1
    }
  }

  const recentDaily = getRecentDateKeys(7).map((date) => ({
    date,
    clicks: Number(clicksByDate[date] || 0),
  }))

  return {
    totalClicks: rows.length,
    clicksByRegion: {
      CN: cnCount,
      INTL: intlCount,
    },
    clicksByPlacement,
    clicksByAd,
    recentDaily,
  }
}

async function getIntlAdClicksSince(sinceIso: string): Promise<Array<any>> {
  const supabase = getSupabaseAdminForDownloads()
  const { data, error } = await supabase
    .from("web_ad_clicks")
    .select("ad_id,region,placement,created_at")
    .gte("created_at", sinceIso)

  if (error) throw new Error(error.message)
  return data || []
}

async function getCnAdClicksSince(sinceIso: string): Promise<Array<any>> {
  const db = await getDatabase()
  await ensureCloudbaseCollections(db)
  const result = await db.collection("web_ad_clicks").where({ created_at: db.command.gte(sinceIso) }).get()
  return result?.data || []
}
