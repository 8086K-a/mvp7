import { NextResponse } from "next/server"

export const runtime = "nodejs"

const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "BRL"])

const FALLBACK_RATES_TO_USD_BASE: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CAD: 1.35,
  AUD: 1.52,
  CHF: 0.88,
  CNY: 7.19,
  INR: 82.95,
  BRL: 4.97,
}

function getFallbackRate(from: string, to: string) {
  const fromRate = FALLBACK_RATES_TO_USD_BASE[from]
  const toRate = FALLBACK_RATES_TO_USD_BASE[to]

  if (!fromRate || !toRate) {
    return null
  }

  return toRate / fromRate
}

function normalizeCurrency(value: string | null) {
  return String(value || "").trim().toUpperCase()
}

async function fetchFrankfurterRate(from: string, to: string) {
  const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Frankfurter request failed with ${response.status}`)
  }

  const data = await response.json()
  const rate = Number(data?.rates?.[to])
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Frankfurter returned an invalid rate")
  }

  return {
    rate,
    source: "frankfurter",
    effectiveAt: String(data?.date || new Date().toISOString()),
  }
}

async function fetchOpenErRate(from: string, to: string) {
  const response = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Open ER API request failed with ${response.status}`)
  }

  const data = await response.json()
  const rate = Number(data?.rates?.[to])
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Open ER API returned an invalid rate")
  }

  return {
    rate,
    source: "open-er-api",
    effectiveAt: String(data?.time_last_update_utc || new Date().toISOString()),
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = normalizeCurrency(searchParams.get("from"))
    const to = normalizeCurrency(searchParams.get("to"))

    if (!SUPPORTED_CURRENCIES.has(from) || !SUPPORTED_CURRENCIES.has(to)) {
      return NextResponse.json({ success: false, error: "Unsupported currency pair" }, { status: 400 })
    }

    if (from === to) {
      return NextResponse.json({
        success: true,
        rate: 1,
        source: "identity",
        effectiveAt: new Date().toISOString(),
      })
    }

    const providers = [fetchFrankfurterRate, fetchOpenErRate]

    for (const provider of providers) {
      try {
        const result = await provider(from, to)
        return NextResponse.json({ success: true, ...result })
      } catch {
        continue
      }
    }

    const fallbackRate = getFallbackRate(from, to)
    if (!fallbackRate) {
      return NextResponse.json({ success: false, error: "No exchange rate available" }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      rate: fallbackRate,
      source: "fallback",
      effectiveAt: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Exchange rate lookup failed" },
      { status: 500 },
    )
  }
}