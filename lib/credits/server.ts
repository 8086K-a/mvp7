import { createClient } from "@supabase/supabase-js"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

let supabaseInstance: ReturnType<typeof createClient> | null = null

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

export interface GrantCreditsOptions {
  userEmail: string
  credits: number
  referenceId: string
  description: string
}

export interface GrantCreditsResult {
  success: boolean
  alreadyProcessed?: boolean
  newCredits?: number
  userId?: string
  storage?: "supabase" | "cloudbase"
  error?: string
}

async function grantCreditsInSupabase(options: GrantCreditsOptions): Promise<GrantCreditsResult> {
  if (resolveDeploymentRegion() !== "INTL") {
    return {
      success: false,
      error: "Supabase credits grant disabled in CN region",
      storage: "supabase",
    }
  }

  const supabase = getSupabase()

  const { data: existingTx } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("reference_id", options.referenceId)
    .maybeSingle()

  if (existingTx?.id) {
    return { success: true, alreadyProcessed: true, storage: "supabase" }
  }

  const { data: user, error: loadError } = await supabase
    .from("user")
    .select("id, credits")
    .eq("email", options.userEmail)
    .maybeSingle()

  if (loadError || !user?.id) {
    return {
      success: false,
      error: loadError?.message || "User not found in Supabase",
    }
  }

  const currentCredits = Number(user.credits ?? 0)
  const safeCurrentCredits = Number.isFinite(currentCredits) ? currentCredits : 0
  const newCredits = safeCurrentCredits + options.credits

  const { error: updateError } = await supabase
    .from("user")
    .update({ credits: newCredits })
    .eq("id", user.id)

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    }
  }

  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: user.id,
    type: "purchase",
    amount: options.credits,
    description: options.description,
    reference_id: options.referenceId,
  })

  if (txError) {
    return {
      success: false,
      error: txError.message,
    }
  }

  return {
    success: true,
    newCredits,
    userId: user.id,
    storage: "supabase",
  }
}

async function grantCreditsInCloudBase(options: GrantCreditsOptions): Promise<GrantCreditsResult> {
  if (resolveDeploymentRegion() !== "CN") {
    return {
      success: false,
      error: "CloudBase credits grant disabled in INTL region",
      storage: "cloudbase",
    }
  }

  try {
    const cloudbaseService = await import("@/lib/database/cloudbase-service")
    const db = await cloudbaseService.getDatabase()

    if (!db) {
      return { success: false, error: "CloudBase unavailable" }
    }

    let existingTx: any
    try {
      existingTx = await db.collection("web_credit_transactions").where({ reference_id: options.referenceId }).get()
    } catch (error: any) {
      const message = String(error?.message || "")
      const code = String(error?.code || "")
      const isMissingCollection =
        message.includes("Db or Table not exist") ||
        message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
        code.includes("DATABASE_COLLECTION_NOT_EXIST")

      if (!isMissingCollection) {
        throw error
      }

      await db.createCollection("web_credit_transactions")
      existingTx = await db.collection("web_credit_transactions").where({ reference_id: options.referenceId }).get()
    }

    if (existingTx?.data?.length > 0) {
      return { success: true, alreadyProcessed: true, storage: "cloudbase" }
    }

    const userResult = await db.collection("web_users").where({ email: options.userEmail }).get()
    const userDoc = userResult?.data?.[0]

    if (!userDoc?._id) {
      return { success: false, error: "User not found in CloudBase" }
    }

    const currentCredits = Number(userDoc.credits ?? 0)
    const safeCurrentCredits = Number.isFinite(currentCredits) ? currentCredits : 0
    const newCredits = safeCurrentCredits + options.credits

    console.info("[credits/cloudbase] before update:", {
      email: options.userEmail,
      userId: userDoc._id,
      currentCredits: safeCurrentCredits,
      grantCredits: options.credits,
      targetCredits: newCredits,
      referenceId: options.referenceId,
    })

    await db.collection("web_users").doc(userDoc._id).update({
      credits: newCredits,
      updatedAt: new Date().toISOString(),
    })

    const verifyUserResult = await db.collection("web_users").where({ _id: userDoc._id }).get()
    const verifyUserDoc = verifyUserResult?.data?.[0]
    const actualCredits = Number(verifyUserDoc?.credits ?? 0)

    if (!Number.isFinite(actualCredits) || actualCredits < newCredits) {
      return {
        success: false,
        error: `CloudBase credits verify failed: expected >= ${newCredits}, got ${actualCredits}`,
        storage: "cloudbase",
      }
    }

    try {
      await db.collection("web_credit_transactions").add({
        user_id: userDoc._id,
        type: "purchase",
        amount: options.credits,
        description: options.description,
        reference_id: options.referenceId,
        created_at: new Date().toISOString(),
      })
    } catch (error: any) {
      const message = String(error?.message || "")
      const code = String(error?.code || "")
      const isMissingCollection =
        message.includes("Db or Table not exist") ||
        message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
        code.includes("DATABASE_COLLECTION_NOT_EXIST")

      if (!isMissingCollection) {
        throw error
      }

      await db.createCollection("web_credit_transactions")
      await db.collection("web_credit_transactions").add({
        user_id: userDoc._id,
        type: "purchase",
        amount: options.credits,
        description: options.description,
        reference_id: options.referenceId,
        created_at: new Date().toISOString(),
      })
    }

    return {
      success: true,
      newCredits: actualCredits,
      userId: userDoc._id,
      storage: "cloudbase",
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "CloudBase grant credits failed",
    }
  }
}

export async function grantCreditsByEmail(options: GrantCreditsOptions): Promise<GrantCreditsResult> {
  const region = resolveDeploymentRegion()

  if (region === "CN") {
    return grantCreditsInCloudBase(options)
  }

  try {
    return await grantCreditsInSupabase(options)
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Supabase credits grant failed",
      storage: "supabase",
    }
  }
}
