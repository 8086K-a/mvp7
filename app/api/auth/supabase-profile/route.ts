import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { FREE_USER_INITIAL_CREDITS } from "@/lib/credits/pricing"
import { bindReferralFromRequest } from "@/lib/market/referrals"

let supabaseInstance: any = null

function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY"
      )
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey)
  }

  return supabaseInstance
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, email, fullName, avatarUrl } = body as {
      userId?: string
      email?: string
      fullName?: string
      avatarUrl?: string
    }

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields: userId, email" }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: existing, error: loadError } = await supabase
      .from("user")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (loadError) {
      console.error("Load user profile failed:", loadError)
      return NextResponse.json({ error: "Failed to load user" }, { status: 500 })
    }

    if (existing) {
      // Optional: refresh avatar/name if provided
      const patch: Record<string, any> = {}
      if (fullName && !existing.full_name) patch.full_name = fullName
      if (avatarUrl && !existing.avatar_url) patch.avatar_url = avatarUrl

      await bindReferralFromRequest({
        request: req,
        invitedUserId: userId,
        invitedEmail: email,
      }).catch((error) => {
        console.error("[referral] bind in supabase-profile(existing) failed:", error)
      })

      if (Object.keys(patch).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from("user")
          .update(patch)
          .eq("id", userId)
          .select("*")
          .maybeSingle()

        if (!updateError && updated) {
          return NextResponse.json({ success: true, user: updated })
        }
      }

      return NextResponse.json({ success: true, user: existing })
    }

    const newProfile = {
      id: userId,
      email,
      full_name: fullName || email.split("@")[0],
      avatar_url: avatarUrl || null,
      credits: FREE_USER_INITIAL_CREDITS,
      subscription_tier: "free",
    }

    const { data: inserted, error: insertError } = await supabase
      .from("user")
      .insert(newProfile)
      .select("*")
      .maybeSingle()

    if (insertError) {
      console.error("Create user profile failed:", insertError)
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    await bindReferralFromRequest({
      request: req,
      invitedUserId: userId,
      invitedEmail: email,
    }).catch((error) => {
      console.error("[referral] bind in supabase-profile(insert) failed:", error)
    })

    return NextResponse.json({ success: true, user: inserted || newProfile })
  } catch (error) {
    console.error("supabase-profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
