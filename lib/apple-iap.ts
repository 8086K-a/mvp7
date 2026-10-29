export function getAppleIapProductId(planId: string, billingCycle: string): string {
  const cycle = billingCycle === "yearly" ? "yearly" : "monthly"
  return `com.morntool.${planId}.${cycle}`
}
