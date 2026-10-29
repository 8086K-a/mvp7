import { MEMBERSHIP_PLANS, getPlanUsdPriceByRegion } from "@/lib/credits/pricing"

export function getPlanPrice(planId: string, period: "monthly" | "annual", isZh?: boolean): number {
  const normalizedId = String(planId || "").toLowerCase()
  const plan = MEMBERSHIP_PLANS.find((item) => item.id === normalizedId || item.tier === normalizedId)
  if (!plan) return 0

  const cycle = period === "annual" ? "yearly" : "monthly"
  const region = isZh ? "CN" : "INTL"
  return getPlanUsdPriceByRegion(plan, cycle, region)
}
