import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const clientId =
    process.env.NATIVE_GOOGLE_WEB_CLIENT_ID ||
    process.env.NEXT_PUBLIC_NATIVE_GOOGLE_WEB_CLIENT_ID ||
    ""

  return NextResponse.json(
    {
      success: true,
      clientId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
