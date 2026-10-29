import { NextRequest, NextResponse } from "next/server"
import { queryWechatOrderByOutTradeNo } from "@/lib/utils/wechatpay-v3-lite"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const outTradeNo = request.nextUrl.searchParams.get("out_trade_no")
    if (!outTradeNo) {
      return NextResponse.json({ success: false, error: "out_trade_no is required" }, { status: 400 })
    }

    const data: any = await queryWechatOrderByOutTradeNo(outTradeNo)
    return NextResponse.json({
      success: true,
      out_trade_no: outTradeNo,
      trade_state: data?.trade_state || null,
      transaction_id: data?.transaction_id || null,
      amount: data?.amount || null,
      raw: data,
    })
  } catch (error: any) {
    console.error("[wechat/query] error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to query WeChat order" },
      { status: 500 }
    )
  }
}
