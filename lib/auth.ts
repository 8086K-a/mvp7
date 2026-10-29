import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function requireAuth(request: NextRequest): Promise<{ user: { id: string; email?: string } } | null> {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token) return null

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user?.id) return null
    return { user: { id: data.user.id, email: data.user.email || undefined } }
  } catch {
    return null
  }
}

export function createAuthErrorResponse() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
}
