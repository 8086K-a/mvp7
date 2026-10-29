import { MarketDashboardClient } from "../market-dashboard-client"
import { requireMarketAdminSession } from "../require-market-session"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function MarketFissionPage() {
  requireMarketAdminSession()
  const region = resolveDeploymentRegion() === "INTL" ? "INTL" : "CN"
  return <MarketDashboardClient region={region} />
}
