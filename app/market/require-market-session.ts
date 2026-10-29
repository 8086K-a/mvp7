import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { decodeMarketAdminSessionToken, MARKET_ADMIN_SESSION_COOKIE } from "@/lib/market/admin-auth"

export function requireMarketAdminSession() {
  const token = cookies().get(MARKET_ADMIN_SESSION_COOKIE)?.value || null
  const session = decodeMarketAdminSessionToken(token)

  if (!session) {
    redirect("/market/login")
  }

  return session
}
