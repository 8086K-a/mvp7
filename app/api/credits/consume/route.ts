import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { createClient } from "@supabase/supabase-js"
import { getToolCreditCost } from "@/lib/credits/pricing"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

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

function normalizeReferenceId(input: string | undefined, userId: string, toolId: string) {
  const raw = String(input || "").trim()
  if (raw) return raw.slice(0, 180)
  return `consume_${toolId}_${userId}_${Date.now()}`
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

async function ensureCloudbaseCollection(db: any, collectionName: string) {
  try {
    await db.collection(collectionName).limit(1).get()
  } catch (error: any) {
    if (!isCloudbaseCollectionMissing(error)) {
      throw error
    }
    await db.createCollection(collectionName)
  }
}

function isRpcMissing(error: any) {
  const code = String(error?.code || "")
  const message = String(error?.message || "")
  return (
    code === "42883" ||
    code === "PGRST202" ||
    message.includes("Could not find the function") ||
    message.includes("function public.consume_credits")
  )
}

function buildTxDocId(referenceId: string) {
  return `tx_${createHash("sha1").update(referenceId).digest("hex")}`
}

/**
 * 降级路径：consume_credits RPC 还没部署时使用。
 * 顺序已修正为「先占位、再扣减」，余额不足时会删除占位做补偿。
 * 但两条语句仍是两个独立请求，没有真正的原子性 —— 部署迁移后应走 RPC。
 */
async function consumeCreditsLegacy(
  supabase: any,
  userId: string,
  cost: number,
  toolId: string,
  referenceId: string
): Promise<NextResponse> {
  console.warn("[credits/consume] consume_credits RPC 不可用，回退到非原子降级路径，请尽快执行迁移")

  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    type: "consume",
    amount: -cost,
    description: `Consumed ${cost} credits for tool ${toolId}`,
    reference_id: referenceId,
  })

  if (txError) {
    if (String(txError?.code || "") === "23505") {
      const { data: currentUser } = await supabase.from("user").select("credits").eq("id", userId).maybeSingle()
      return NextResponse.json({
        success: true,
        newCredits: Number(currentUser?.credits ?? 0),
        alreadyProcessed: true,
      })
    }
    console.error("Insert credit transaction failed:", txError)
    return NextResponse.json({ error: "Failed to record credit transaction" }, { status: 500 })
  }

  const { data: user, error: loadError } = await supabase
    .from("user")
    .select("credits")
    .eq("id", userId)
    .maybeSingle()

  const currentCredits = Number(user?.credits ?? 0)

  if (loadError || !Number.isFinite(currentCredits) || currentCredits < cost) {
    await supabase.from("credit_transactions").delete().eq("reference_id", referenceId)
    if (loadError) {
      console.error("Load user credits failed:", loadError)
      return NextResponse.json({ error: "Failed to load user" }, { status: 500 })
    }
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
  }

  const newCredits = currentCredits - cost
  const { error: updateError } = await supabase.from("user").update({ credits: newCredits }).eq("id", userId)

  if (updateError) {
    await supabase.from("credit_transactions").delete().eq("reference_id", referenceId)
    console.error("Update credits failed:", updateError)
    return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
  }

  return NextResponse.json({ success: true, newCredits, alreadyProcessed: false })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, toolId, referenceId } = body as {
      userId?: string
      toolId?: string
      referenceId?: string
    }

    if (!userId || !toolId) {
      return NextResponse.json({ error: "Missing required fields: userId, toolId" }, { status: 400 })
    }

    const cost = getToolCreditCost(toolId)
    if (!cost || cost <= 0) {
      return NextResponse.json({ error: "Unknown toolId" }, { status: 400 })
    }
    const finalReferenceId = normalizeReferenceId(referenceId, userId, toolId)

    const isChinaRegion = resolveDeploymentRegion() === "CN"

    if (!isChinaRegion) {
      const supabase = getSupabase()

      const { data, error } = await supabase.rpc("consume_credits", {
        p_user_id: userId,
        p_cost: cost,
        p_tool_id: toolId,
        p_reference_id: finalReferenceId,
      })

      if (error) {
        const message = String(error.message || "")

        if (isRpcMissing(error)) {
          return consumeCreditsLegacy(supabase, userId, cost, toolId, finalReferenceId)
        }

        if (String(error.code || "") === "42501") {
          console.error(
            "[credits/consume] 无权执行 consume_credits：请确认已配置 SUPABASE_SERVICE_ROLE_KEY（该函数只授权给 service_role）"
          )
          return NextResponse.json({ error: "Credits service misconfigured" }, { status: 500 })
        }

        if (message.includes("INSUFFICIENT_CREDITS")) {
          return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
        }

        if (message.includes("USER_NOT_FOUND")) {
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        if (message.includes("INVALID_REFERENCE_ID") || message.includes("INVALID_COST")) {
          return NextResponse.json({ error: "Invalid consume request" }, { status: 400 })
        }

        console.error("consume_credits rpc failed:", error)
        return NextResponse.json({ error: "Failed to consume credits" }, { status: 500 })
      }

      const row = Array.isArray(data) ? data[0] : data

      return NextResponse.json({
        success: true,
        newCredits: Number(row?.new_credits ?? 0),
        alreadyProcessed: Boolean(row?.already_processed),
      })
    }

    try {
      const cloudbaseService = await import("@/lib/database/cloudbase-service")
      const db = await cloudbaseService.getDatabase()

      if (!db) {
        return NextResponse.json({ error: "CloudBase unavailable" }, { status: 500 })
      }

      await ensureCloudbaseCollection(db, "web_credit_transactions")
      const _ = db.command
      const users = db.collection("web_users")
      const txCollection = db.collection("web_credit_transactions")
      const txDocId = buildTxDocId(finalReferenceId)

      // 步骤 1：占位。用确定性 _id 模拟唯一索引，重复 add 会直接报错。
      try {
        await txCollection.add({
          _id: txDocId,
          user_id: userId,
          type: "consume",
          amount: -cost,
          description: `Consumed ${cost} credits for tool ${toolId}`,
          reference_id: finalReferenceId,
          created_at: new Date().toISOString(),
        })
      } catch (addError: any) {
        const message = String(addError?.message || "")
        const code = String(addError?.code || "")
        const isDuplicate =
          message.toLowerCase().includes("duplicate") ||
          message.includes("已存在") ||
          code === "DATABASE_DUPLICATE_KEY" ||
          code === "-501001"

        if (isDuplicate) {
          const currentUserDoc = await users.doc(userId).get()
          const currentCredits = Number(currentUserDoc?.data?.[0]?.credits ?? 0)
          return NextResponse.json({ success: true, newCredits: currentCredits, alreadyProcessed: true })
        }
        throw addError
      }

      // 步骤 2：条件原子扣减，余额不足时受影响行数为 0
      const updateResult: any = await users
        .where({ _id: userId, credits: _.gte(cost) })
        .update({ credits: _.inc(-cost), updatedAt: new Date().toISOString() })

      const updatedCount = Number(
        updateResult?.updated ?? updateResult?.stats?.updated ?? updateResult?.data?.updated ?? 0
      )

      if (updatedCount === 0) {
        // 补偿：撤掉占位，否则这张单会被当成"已处理但没扣钱"
        try {
          await txCollection.doc(txDocId).remove()
        } catch (removeError) {
          console.error("Rollback credit placeholder failed:", removeError)
        }
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
      }

      const verifyUserDoc = await users.doc(userId).get()
      const newCredits = Number(verifyUserDoc?.data?.[0]?.credits ?? 0)

      return NextResponse.json({ success: true, newCredits, alreadyProcessed: false })
    } catch (error) {
      console.error("CloudBase consume credits failed:", error)
      return NextResponse.json({ error: "Failed to update credits in CloudBase" }, { status: 500 })
    }
  } catch (error) {
    console.error("Consume credits error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
