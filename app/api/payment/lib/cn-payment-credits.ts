import { getMembershipPlanById, getMembershipCreditsGrant } from "@/lib/credits/pricing"
import { grantCreditsByEmail } from "@/lib/credits/server"

export interface ApplyCnPaymentCreditsOptions {
  db: any
  paymentRecord: any
  referenceId: string
}

export interface ApplyCnPaymentCreditsResult {
  success: boolean
  alreadyProcessed?: boolean
  creditsToAdd?: number
  userEmail?: string
  planId?: string
  billingCycle?: string
  error?: string
}

export async function applyCnPaymentCredits(
  options: ApplyCnPaymentCreditsOptions
): Promise<ApplyCnPaymentCreditsResult> {
  const paymentRecord = options.paymentRecord || {}

  if (paymentRecord?.credits_applied) {
    return { success: true, alreadyProcessed: true }
  }

  const billingCycle =
    paymentRecord?.billing_cycle || paymentRecord?.metadata?.billingCycle || "monthly"
  const planId = String(paymentRecord?.plan_type || paymentRecord?.metadata?.planId || "pro")
  const plan = getMembershipPlanById(planId)
  const creditsToAdd = plan ? getMembershipCreditsGrant(plan, billingCycle as any) : 0
  const userEmail = String(paymentRecord?.user_email || paymentRecord?.metadata?.userEmail || "").trim()

  if (!userEmail) {
    return { success: false, error: "payment record missing user_email" }
  }

  if (!creditsToAdd || creditsToAdd <= 0) {
    return {
      success: false,
      error: `invalid creditsToAdd for plan ${planId}`,
      userEmail,
      planId,
      billingCycle,
    }
  }

  const grantResult = await grantCreditsByEmail({
    userEmail,
    credits: creditsToAdd,
    referenceId: options.referenceId,
    description: `CN payment credits (${planId}-${billingCycle})`,
  })

  if (!(grantResult.success || grantResult.alreadyProcessed)) {
    return {
      success: false,
      error: grantResult.error || "failed to grant credits",
      creditsToAdd,
      userEmail,
      planId,
      billingCycle,
    }
  }

  const outTradeNo = String(paymentRecord?.out_trade_no || "").trim()
  if (outTradeNo) {
    await options.db.collection("payments").where({ out_trade_no: outTradeNo }).update({
      credits_applied: true,
      updated_at: new Date().toISOString(),
    })
  }

  return {
    success: true,
    alreadyProcessed: Boolean(grantResult.alreadyProcessed),
    creditsToAdd,
    userEmail,
    planId,
    billingCycle,
  }
}

