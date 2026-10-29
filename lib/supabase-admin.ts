import { createClient } from "@supabase/supabase-js"

let supabaseAdminInstance: any = null

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
      ""

    if (!url || !key) {
      throw new Error(
        "Supabase admin config missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY"
      )
    }

    supabaseAdminInstance = createClient(url, key)
  }

  return supabaseAdminInstance
}

export const supabaseAdmin: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabaseAdmin()
      const value = (client as any)[prop]
      return typeof value === "function" ? value.bind(client) : value
    },
  }
)

export { getSupabaseAdmin }
