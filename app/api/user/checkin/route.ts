import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase } from "@/lib/database/cloudbase-service"

export const runtime = "nodejs"

const DAILY_CHECKIN_CREDITS = 10
const CHECKIN_PREFIX = "daily_checkin_"

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

function parseCheckinDateFromReference(referenceId: string) {
  const matched = String(referenceId || "").match(/^daily_checkin_(\d{4}-\d{2}-\d{2})_/)
  return matched?.[1] || null
}

function uniqueDates(values: string[]) {
  return Array.from(new Set(values)).sort()
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    throw new Error("Supabase admin config missing")
  }

  return createClient(url, key)
}

async function resolveCnUser(input: { userId?: string; email?: string }) {
  const db = await getDatabase()
  const userId = String(input.userId || "").trim()
  const email = normalizeEmail(input.email)

  const byId = userId ? await db.collection("web_users").where({ _id: userId }).get() : null
  let user = byId?.data?.[0]

  if (!user && email) {
    const byEmail = await db.collection("web_users").where({ email }).get()
    user = byEmail?.data?.[0]
  }

  return user || null
}

async function resolveIntlUser(input: { userId?: string; email?: string }) {
  const supabase = getSupabaseAdmin()
  const userId = String(input.userId || "").trim()
  const email = normalizeEmail(input.email)

  if (userId) {
    const { data } = await supabase
      .from("user")
      .select("id, email, credits")
      .eq("id", userId)
      .maybeSingle()

    if (data?.id) return data
  }

  if (!email) return null

  const { data } = await supabase
    .from("user")
    .select("id, email, credits")
    .ilike("email", email)
    .maybeSingle()

  return data || null
}

async function listCnCheckinDates(userId: string) {
  const db = await getDatabase()

  try {
    const result = await db.collection("web_credit_transactions").where({ user_id: userId }).get()
    const dates = (result?.data || [])
      .map((item: any) => parseCheckinDateFromReference(String(item?.reference_id || "")))
      .filter((value: string | null): value is string => Boolean(value))

    return uniqueDates(dates)
  } catch (error: any) {
    const message = String(error?.message || "")
    const code = String(error?.code || "")
    const missing =
      message.includes("Db or Table not exist") ||
      message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
      code.includes("DATABASE_COLLECTION_NOT_EXIST")

    if (missing) {
      try {
        await db.createCollection("web_credit_transactions")
      } catch {
        // ignore if race-created
      }
      return []
    }

    throw error
  }
}

async function listIntlCheckinDates(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("reference_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    throw new Error(error.message)
  }

  const dates = (data || [])
    .map((item: any) => parseCheckinDateFromReference(String(item?.reference_id || "")))
    .filter((value: string | null): value is string => Boolean(value))

  return uniqueDates(dates)
}

async function getCheckinStatus(input: { userId?: string; email?: string }) {
  const region = resolveDeploymentRegion()
  const today = getTodayKey()

  if (region === "CN") {
    const user = await resolveCnUser(input)
    if (!user?._id) {
      return { success: false, status: 404, error: "User not found" }
    }

    const dates = await listCnCheckinDates(String(user._id))
    return {
      success: true,
      data: {
        region,
        today,
        todayCheckedIn: dates.includes(today),
        checkinDates: dates,
        credits: Number.isFinite(user.credits) ? Number(user.credits) : 0,
        dailyCredits: DAILY_CHECKIN_CREDITS,
      },
    }
  }

  const user = await resolveIntlUser(input)
  if (!user?.id) {
    return { success: false, status: 404, error: "User not found" }
  }

  const dates = await listIntlCheckinDates(String(user.id))
  return {
    success: true,
    data: {
      region,
      today,
      todayCheckedIn: dates.includes(today),
      checkinDates: dates,
      credits: Number.isFinite(user.credits) ? Number(user.credits) : 0,
      dailyCredits: DAILY_CHECKIN_CREDITS,
    },
  }
}

async function applyCheckin(input: { userId?: string; email?: string }) {
  const region = resolveDeploymentRegion()
  const today = getTodayKey()

  if (region === "CN") {
    const db = await getDatabase()
    const user = await resolveCnUser(input)

    if (!user?._id) {
      return { success: false, status: 404, error: "User not found" }
    }

    const referenceId = `${CHECKIN_PREFIX}${today}_${user._id}`

    let existing: any = null
    try {
      existing = await db.collection("web_credit_transactions").where({ reference_id: referenceId }).get()
    } catch (error: any) {
      const message = String(error?.message || "")
      const code = String(error?.code || "")
      const missing =
        message.includes("Db or Table not exist") ||
        message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
        code.includes("DATABASE_COLLECTION_NOT_EXIST")

      if (missing) {
        try {
          await db.createCollection("web_credit_transactions")
        } catch {
          // ignore
        }
        existing = await db.collection("web_credit_transactions").where({ reference_id: referenceId }).get()
      } else {
        throw error
      }
    }

    if ((existing?.data?.length || 0) > 0) {
      const dates = await listCnCheckinDates(String(user._id))
      return {
        success: true,
        data: {
          alreadyCheckedIn: true,
          today,
          todayCheckedIn: true,
          checkinDates: dates,
          credits: Number.isFinite(user.credits) ? Number(user.credits) : 0,
          dailyCredits: DAILY_CHECKIN_CREDITS,
        },
      }
    }

    const currentCredits = Number.isFinite(user.credits) ? Number(user.credits) : 0
    const newCredits = currentCredits + DAILY_CHECKIN_CREDITS

    await db.collection("web_users").doc(String(user._id)).update({
      credits: newCredits,
      updatedAt: new Date().toISOString(),
    })

    await db.collection("web_credit_transactions").add({
      user_id: String(user._id),
      type: "adjustment",
      amount: DAILY_CHECKIN_CREDITS,
      description: "Daily check-in reward",
      reference_id: referenceId,
      created_at: new Date().toISOString(),
    })

    const dates = await listCnCheckinDates(String(user._id))

    return {
      success: true,
      data: {
        alreadyCheckedIn: false,
        today,
        todayCheckedIn: true,
        checkinDates: dates,
        credits: newCredits,
        dailyCredits: DAILY_CHECKIN_CREDITS,
      },
    }
  }

  const supabase = getSupabaseAdmin()
  const user = await resolveIntlUser(input)

  if (!user?.id) {
    return { success: false, status: 404, error: "User not found" }
  }

  const referenceId = `${CHECKIN_PREFIX}${today}_${user.id}`

  const { data: existingTx } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("reference_id", referenceId)
    .maybeSingle()

  if (existingTx?.id) {
    const dates = await listIntlCheckinDates(String(user.id))
    return {
      success: true,
      data: {
        alreadyCheckedIn: true,
        today,
        todayCheckedIn: true,
        checkinDates: dates,
        credits: Number.isFinite(user.credits) ? Number(user.credits) : 0,
        dailyCredits: DAILY_CHECKIN_CREDITS,
      },
    }
  }

  const currentCredits = Number.isFinite(user.credits) ? Number(user.credits) : 0
  const newCredits = currentCredits + DAILY_CHECKIN_CREDITS

  const { error: updateError } = await supabase
    .from("user")
    .update({ credits: newCredits })
    .eq("id", user.id)

  if (updateError) {
    return { success: false, status: 500, error: updateError.message }
  }

  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: user.id,
    type: "adjustment",
    amount: DAILY_CHECKIN_CREDITS,
    description: "Daily check-in reward",
    reference_id: referenceId,
  })

  if (txError) {
    const duplicated = String(txError.code || "") === "23505"
    if (duplicated) {
      const dates = await listIntlCheckinDates(String(user.id))
      return {
        success: true,
        data: {
          alreadyCheckedIn: true,
          today,
          todayCheckedIn: true,
          checkinDates: dates,
          credits: newCredits,
          dailyCredits: DAILY_CHECKIN_CREDITS,
        },
      }
    }

    return { success: false, status: 500, error: txError.message }
  }

  const dates = await listIntlCheckinDates(String(user.id))
  return {
    success: true,
    data: {
      alreadyCheckedIn: false,
      today,
      todayCheckedIn: true,
      checkinDates: dates,
      credits: newCredits,
      dailyCredits: DAILY_CHECKIN_CREDITS,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") || undefined
    const email = request.nextUrl.searchParams.get("email") || undefined

    const result = await getCheckinStatus({ userId, email })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, ...result.data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = body?.userId ? String(body.userId) : undefined
    const email = body?.email ? String(body.email) : undefined

    const result = await applyCheckin({ userId, email })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, ...result.data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500 })
  }
}
