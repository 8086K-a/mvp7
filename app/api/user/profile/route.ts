import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

export const runtime = "nodejs"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin config missing")
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function isUuid(value?: string | null) {
  const id = String(value || "").trim()
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

export async function GET(request: NextRequest) {
  try {
    const userId = String(request.nextUrl.searchParams.get("id") || "").trim()
    const userEmail = String(request.nextUrl.searchParams.get("email") || "").trim().toLowerCase()

    if (!userId && !userEmail) {
      return NextResponse.json({ success: false, error: "id or email is required" }, { status: 400 })
    }

    const region = resolveDeploymentRegion()

    if (region === "CN") {
      const db = await getDatabase()
      const result = userId
        ? await db.collection("web_users").where({ _id: userId }).get()
        : await db.collection("web_users").where({ email: userEmail }).get()

      const user = result?.data?.[0]

      if (!user) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name || user.full_name || user.nickname || "",
          full_name: user.full_name || user.name || user.nickname || null,
          avatar: user.avatar || user.avatar_url || null,
          avatar_url: user.avatar_url || user.avatar || null,
          credits: Number.isFinite(user.credits) ? user.credits : 0,
          pro: Boolean(user.pro),
          subscription_tier: user.subscription_tier || (user.pro ? "pro" : "free"),
          subscription_expires_at: user.subscription_expires_at || user.membership_expires_at || null,
          membership_expires_at: user.membership_expires_at || null,
        },
      })
    }

    const supabase = getSupabaseAdmin()

    let query = supabase.from("user").select("id, email, full_name, avatar_url, credits, subscription_tier, subscription_expires_at, created_at, updated_at")

    if (userId && isUuid(userId)) {
      query = query.eq("id", userId)
    } else if (userEmail) {
      query = query.ilike("email", userEmail)
    } else {
      return NextResponse.json({ success: false, error: "invalid user id" }, { status: 400 })
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        name: data.full_name || (data.email ? String(data.email).split("@")[0] : ""),
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        credits: Number.isFinite(data.credits) ? data.credits : 0,
        subscription_tier: data.subscription_tier || "free",
        subscription_expires_at: data.subscription_expires_at || null,
        pro: Boolean(data.subscription_tier && data.subscription_tier !== "free"),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
