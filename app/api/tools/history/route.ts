import { NextRequest, NextResponse } from "next/server"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

const CN_COLLECTION = "web_tool_history"
const INTL_TABLE = "tool_history"
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

interface ToolHistoryItem {
  id: string
  userId: string
  userEmail: string | null
  toolId: string
  toolTitle: string
  toolDescription: string | null
  toolUrl: string | null
  eventType: string
  createdAt: string
}

interface NormalizedPayload {
  toolId: string
  toolTitle: string
  toolDescription: string | null
  toolUrl: string | null
  eventType: string
  metadata: Record<string, any> | null
}

interface ResolvedUser {
  id: string
  email: string | null
}

function safeText(value: any, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength)
}

function normalizeUserId(value: any) {
  return safeText(value, 128)
}

function normalizeEmail(value: any) {
  return safeText(value, 255).toLowerCase()
}

function normalizeToolId(value: any) {
  return safeText(value, 80).toLowerCase().replace(/[^a-z0-9-]/g, "")
}

function normalizeEventType(value: any) {
  return safeText(value, 32).toLowerCase().replace(/[^a-z0-9_-]/g, "") || "open"
}

function normalizeItemId(value: any) {
  return safeText(value, 128).replace(/[^a-zA-Z0-9_-]/g, "")
}

function toIsoTimestamp(value: any) {
  const raw = String(value || "").trim()
  if (!raw) {
    return new Date().toISOString()
  }
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) {
    return new Date().toISOString()
  }
  return date.toISOString()
}

function parseLimit(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT
  }
  return Math.min(MAX_LIMIT, Math.floor(parsed))
}

function isPlainObject(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeToolUrl(value: any, fallbackToolId: string) {
  const raw = safeText(value, 512)
  if (!raw) {
    return fallbackToolId ? `/tools/${fallbackToolId}` : null
  }

  if (raw.startsWith("/")) {
    return raw
  }

  try {
    const url = new URL(raw)
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().slice(0, 512)
    }
  } catch {
    // ignore invalid URL
  }

  return fallbackToolId ? `/tools/${fallbackToolId}` : null
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = String(value || "").trim()
    if (normalized) {
      return normalized
    }
  }
  return ""
}

function isCloudbaseCollectionMissing(error: any) {
  const message = String(error?.message || "")
  const code = String(error?.code || "")
  return (
    message.includes("Db or Table not exist") ||
    message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
    code.includes("DATABASE_COLLECTION_NOT_EXIST")
  )
}

function isSupabaseTableMissing(error: any) {
  const code = String(error?.code || "")
  const message = String(error?.message || "").toLowerCase()
  return (
    code === "42P01" ||
    message.includes(`relation "${INTL_TABLE}" does not exist`) ||
    message.includes(`relation "${INTL_TABLE.toLowerCase()}" does not exist`)
  )
}

function isUuid(value?: string | null) {
  const id = String(value || "").trim()
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

function mapCnRow(row: any): ToolHistoryItem {
  return {
    id: String(row?._id || row?.id || ""),
    userId: String(row?.user_id || ""),
    userEmail: normalizeEmail(row?.user_email || "") || null,
    toolId: normalizeToolId(row?.tool_id || ""),
    toolTitle: safeText(row?.tool_title || "", 120) || normalizeToolId(row?.tool_id || ""),
    toolDescription: safeText(row?.tool_description || "", 300) || null,
    toolUrl: safeText(row?.tool_url || "", 512) || null,
    eventType: normalizeEventType(row?.event_type || "open"),
    createdAt: toIsoTimestamp(row?.created_at || row?.createdAt || row?._createTime),
  }
}

function mapIntlRow(row: any): ToolHistoryItem {
  return {
    id: String(row?.id || ""),
    userId: String(row?.user_id || ""),
    userEmail: normalizeEmail(row?.user_email || "") || null,
    toolId: normalizeToolId(row?.tool_id || ""),
    toolTitle: safeText(row?.tool_title || "", 120) || normalizeToolId(row?.tool_id || ""),
    toolDescription: safeText(row?.tool_description || "", 300) || null,
    toolUrl: safeText(row?.tool_url || "", 512) || null,
    eventType: normalizeEventType(row?.event_type || "open"),
    createdAt: toIsoTimestamp(row?.created_at),
  }
}

function normalizePayload(input: any): NormalizedPayload | null {
  const toolId = normalizeToolId(input?.toolId)
  if (!toolId) {
    return null
  }

  const toolTitle = safeText(input?.toolTitle || "", 120) || toolId
  const toolDescription = safeText(input?.toolDescription || "", 300) || null
  const toolUrl = normalizeToolUrl(input?.toolUrl, toolId)
  const eventType = normalizeEventType(input?.eventType)

  let metadata: Record<string, any> | null = null
  if (isPlainObject(input?.metadata)) {
    try {
      const raw = JSON.stringify(input.metadata)
      if (raw.length <= 4000) {
        metadata = input.metadata
      }
    } catch {
      metadata = null
    }
  }

  return {
    toolId,
    toolTitle,
    toolDescription,
    toolUrl,
    eventType,
    metadata,
  }
}

function resolveIdentity(
  request: NextRequest,
  overrides?: { userId?: string | null; email?: string | null },
) {
  const userId = normalizeUserId(
    firstNonEmpty(
      overrides?.userId,
      request.headers.get("x-user-id"),
      request.nextUrl.searchParams.get("userId"),
    ),
  )

  const email = normalizeEmail(
    firstNonEmpty(
      overrides?.email,
      request.headers.get("x-user-email"),
      request.nextUrl.searchParams.get("email"),
    ),
  )

  return {
    userId: userId || undefined,
    email: email || undefined,
  }
}

async function ensureCloudbaseCollection(db: any, collectionName: string) {
  try {
    await db.collection(collectionName).limit(1).get()
  } catch (error: any) {
    if (!isCloudbaseCollectionMissing(error)) {
      throw error
    }
    try {
      await db.createCollection(collectionName)
    } catch {
      // ignore race create
    }
  }
}

async function resolveCnUser(identity: { userId?: string; email?: string }): Promise<ResolvedUser | null> {
  const db = await getDatabase()
  const userId = String(identity.userId || "").trim()
  const email = normalizeEmail(identity.email || "")

  if (userId) {
    const byId = await db.collection("web_users").where({ _id: userId }).limit(1).get()
    const user = byId?.data?.[0]
    if (user?._id) {
      return {
        id: String(user._id),
        email: normalizeEmail(user.email) || email || null,
      }
    }
  }

  if (!email) {
    return null
  }

  const byEmail = await db.collection("web_users").where({ email }).limit(1).get()
  const user = byEmail?.data?.[0]

  if (!user?._id) {
    return null
  }

  return {
    id: String(user._id),
    email: normalizeEmail(user.email) || email,
  }
}

async function resolveIntlUser(identity: { userId?: string; email?: string }): Promise<ResolvedUser | null> {
  const supabase = getSupabaseAdmin()
  const userId = String(identity.userId || "").trim()
  const email = normalizeEmail(identity.email || "")

  if (userId && isUuid(userId)) {
    const { data, error } = await supabase
      .from("user")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (data?.id) {
      return {
        id: String(data.id),
        email: normalizeEmail(data.email) || email || null,
      }
    }
  }

  if (!email) {
    return null
  }

  const { data, error } = await supabase
    .from("user")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.id) {
    return null
  }

  return {
    id: String(data.id),
    email: normalizeEmail(data.email) || email,
  }
}

async function listCnToolHistory(userId: string, options: { toolId?: string; limit: number }) {
  const db = await getDatabase()
  await ensureCloudbaseCollection(db, CN_COLLECTION)

  const whereQuery = options.toolId
    ? { user_id: userId, tool_id: options.toolId }
    : { user_id: userId }

  const result = await db.collection(CN_COLLECTION).where(whereQuery).get()
  const rows = Array.isArray(result?.data) ? result.data : []

  const items = (rows as any[])
    .map((row) => mapCnRow(row))
    .filter((item: ToolHistoryItem) => item.id && item.toolId)
    .sort(
      (left: ToolHistoryItem, right: ToolHistoryItem) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, options.limit)

  return { items }
}

async function listIntlToolHistory(userId: string, options: { toolId?: string; limit: number }) {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from(INTL_TABLE)
    .select("id, user_id, user_email, tool_id, tool_title, tool_description, tool_url, event_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options.limit)

  if (options.toolId) {
    query = query.eq("tool_id", options.toolId)
  }

  const { data, error } = await query

  if (error) {
    if (isSupabaseTableMissing(error)) {
      return {
        items: [] as ToolHistoryItem[],
        warning: "tool_history table not found",
      }
    }
    throw new Error(error.message)
  }

  const items = (Array.isArray(data) ? data : []).map(mapIntlRow).filter((item) => item.id && item.toolId)
  return { items }
}

async function saveCnToolHistory(user: ResolvedUser, payload: NormalizedPayload) {
  const db = await getDatabase()
  await ensureCloudbaseCollection(db, CN_COLLECTION)

  const createdAt = new Date().toISOString()
  const document = {
    user_id: user.id,
    user_email: user.email || null,
    tool_id: payload.toolId,
    tool_title: payload.toolTitle,
    tool_description: payload.toolDescription,
    tool_url: payload.toolUrl,
    event_type: payload.eventType,
    metadata: payload.metadata,
    created_at: createdAt,
    updated_at: createdAt,
  }

  const created = await db.collection(CN_COLLECTION).add(document)
  const latest = await db.collection(CN_COLLECTION).where({ _id: created.id }).limit(1).get()
  const row = latest?.data?.[0] || { _id: created.id, ...document }

  return { item: mapCnRow(row) }
}

async function saveIntlToolHistory(user: ResolvedUser, payload: NormalizedPayload) {
  const supabase = getSupabaseAdmin()
  const insertPayload = {
    user_id: user.id,
    user_email: user.email || null,
    tool_id: payload.toolId,
    tool_title: payload.toolTitle,
    tool_description: payload.toolDescription,
    tool_url: payload.toolUrl,
    event_type: payload.eventType,
    metadata: payload.metadata,
  }

  const { data, error } = await supabase
    .from(INTL_TABLE)
    .insert(insertPayload)
    .select("id, user_id, user_email, tool_id, tool_title, tool_description, tool_url, event_type, created_at")
    .maybeSingle()

  if (error) {
    if (isSupabaseTableMissing(error)) {
      return {
        item: null,
        warning: "tool_history table not found",
      }
    }
    throw new Error(error.message)
  }

  return { item: data ? mapIntlRow(data) : null }
}

async function deleteCnToolHistory(userId: string, options: { itemId?: string; toolId?: string }) {
  const db = await getDatabase()
  await ensureCloudbaseCollection(db, CN_COLLECTION)

  const whereQuery: Record<string, any> = { user_id: userId }
  if (options.itemId) {
    whereQuery._id = options.itemId
  }
  if (options.toolId) {
    whereQuery.tool_id = options.toolId
  }

  const result = await db.collection(CN_COLLECTION).where(whereQuery).get()
  const rows = Array.isArray(result?.data) ? result.data : []

  let deletedCount = 0
  for (const row of rows) {
    const id = String(row?._id || "").trim()
    if (!id) continue
    await db.collection(CN_COLLECTION).doc(id).remove().catch(() => null)
    deletedCount += 1
  }

  return { deletedCount }
}

async function deleteIntlToolHistory(userId: string, options: { itemId?: string; toolId?: string }) {
  const supabase = getSupabaseAdmin()
  let query = supabase.from(INTL_TABLE).delete({ count: "exact" }).eq("user_id", userId)

  if (options.itemId) {
    query = query.eq("id", options.itemId)
  }

  if (options.toolId) {
    query = query.eq("tool_id", options.toolId)
  }

  const { error, count } = await query

  if (error) {
    if (isSupabaseTableMissing(error)) {
      return {
        deletedCount: 0,
        warning: "tool_history table not found",
      }
    }
    throw new Error(error.message)
  }

  return {
    deletedCount: Number(count || 0),
  }
}

export async function GET(request: NextRequest) {
  try {
    const toolId = normalizeToolId(request.nextUrl.searchParams.get("toolId"))
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"))
    const identity = resolveIdentity(request)

    if (!identity.userId && !identity.email) {
      return NextResponse.json({ success: false, error: "userId or email is required" }, { status: 400 })
    }

    const region = resolveDeploymentRegion()
    const user = region === "CN" ? await resolveCnUser(identity) : await resolveIntlUser(identity)

    if (!user?.id) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (region === "CN") {
      const result = await listCnToolHistory(user.id, { toolId: toolId || undefined, limit })
      return NextResponse.json({ success: true, region, items: result.items })
    }

    const result = await listIntlToolHistory(user.id, { toolId: toolId || undefined, limit })
    return NextResponse.json({ success: true, region, items: result.items, warning: result.warning || null })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const identity = resolveIdentity(request, { userId: body?.userId, email: body?.email })

    if (!identity.userId && !identity.email) {
      return NextResponse.json({ success: false, error: "userId or email is required" }, { status: 400 })
    }

    const payload = normalizePayload(body)
    if (!payload) {
      return NextResponse.json({ success: false, error: "toolId is required" }, { status: 400 })
    }

    const region = resolveDeploymentRegion()
    const user = region === "CN" ? await resolveCnUser(identity) : await resolveIntlUser(identity)

    if (!user?.id) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (region === "CN") {
      const result = await saveCnToolHistory(user, payload)
      return NextResponse.json({ success: true, region, item: result.item })
    }

    const result = await saveIntlToolHistory(user, payload)
    return NextResponse.json({ success: true, region, item: result.item, warning: result.warning || null })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const identity = resolveIdentity(request, { userId: body?.userId, email: body?.email })
    const itemId = normalizeItemId(body?.itemId)
    const toolId = normalizeToolId(body?.toolId)

    if (!identity.userId && !identity.email) {
      return NextResponse.json({ success: false, error: "userId or email is required" }, { status: 400 })
    }

    const region = resolveDeploymentRegion()
    const user = region === "CN" ? await resolveCnUser(identity) : await resolveIntlUser(identity)

    if (!user?.id) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (region === "CN") {
      const result = await deleteCnToolHistory(user.id, {
        itemId: itemId || undefined,
        toolId: toolId || undefined,
      })
      return NextResponse.json({ success: true, region, deletedCount: result.deletedCount })
    }

    const result = await deleteIntlToolHistory(user.id, {
      itemId: itemId || undefined,
      toolId: toolId || undefined,
    })
    return NextResponse.json({
      success: true,
      region,
      deletedCount: result.deletedCount,
      warning: result.warning || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 },
    )
  }
}
