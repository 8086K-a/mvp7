import { MarketAnalyticsDashboardClient } from "./market-analytics-dashboard-client"
import { requireMarketAdminSession } from "../require-market-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function MarketAnalyticsPage() {
  requireMarketAdminSession()
  return <MarketAnalyticsDashboardClient />
}
