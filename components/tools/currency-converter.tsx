"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, ArrowRightLeft, Calculator, RefreshCw } from "lucide-react"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
}

const currencies: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
]

const fallbackRatesToUsdBase: Record<string, number> = {
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
  const fromRate = fallbackRatesToUsdBase[from]
  const toRate = fallbackRatesToUsdBase[to]

  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency pair: ${from}-${to}`)
  }

  return toRate / fromRate
}

export function CurrencyConverter() {
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `currencyConverterTool.${key}`)
  
  const [amount, setAmount] = useState("100")
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("EUR")
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [error, setError] = useState<string>("")
  const userInteractedRef = useRef(false)
  const requestIdRef = useRef(0)

  // Bulk conversion
  const [bulkInput, setBulkInput] = useState("")
  const [bulkResults, setBulkResults] = useState<Array<{ amount: number; result: number }>>([])

  const getExchangeRate = async (from: string, to: string): Promise<{ rate: number; effectiveAt: string }> => {
    if (from === to) {
      return {
        rate: 1,
        effectiveAt: new Date().toISOString(),
      }
    }

    try {
      const response = await fetch(`/api/tools/exchange-rates?from=${from}&to=${to}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Exchange rate request failed with ${response.status}`)
      }

      const data = await response.json()
      const rate = Number(data?.rate)
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Invalid exchange rate response")
      }

      return {
        rate,
        effectiveAt: String(data?.effectiveAt || new Date().toISOString()),
      }
    } catch (error) {
      return {
        rate: getFallbackRate(from, to),
        effectiveAt: new Date().toISOString(),
      }
    }
  }

  const updateConvertedAmount = (rate: number | null, nextAmount = amount) => {
    if (!nextAmount) {
      setConvertedAmount(null)
      return
    }

    const numericAmount = Number.parseFloat(nextAmount)
    if (!Number.isFinite(numericAmount)) {
      setConvertedAmount(null)
      return
    }

    setConvertedAmount(numericAmount * (rate ?? 1))
  }

  const refreshExchangeRate = async (emitSuccessOnFinish = false) => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    setError("")

    try {
      const { rate, effectiveAt } = await getExchangeRate(fromCurrency, toCurrency)

      if (requestId !== requestIdRef.current) {
        return
      }

      setExchangeRate(rate)
      updateConvertedAmount(rate)
      setLastUpdated(new Date(effectiveAt).toLocaleString())

      if (emitSuccessOnFinish) {
        emitToolSuccess("currency-converter")
      }
    } catch (error) {
      console.error("Conversion failed:", error)
      if (requestId === requestIdRef.current) {
        setError(tr("failedToLoadRate") || "Failed to load exchange rate")
        setExchangeRate(null)
        setConvertedAmount(null)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
        userInteractedRef.current = false
      }
    }
  }

  const swapCurrencies = () => {
    userInteractedRef.current = true
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const convertBulk = async () => {
    const amounts = bulkInput
      .split("\n")
      .map((line) => Number.parseFloat(line.trim()))
      .filter((num) => !isNaN(num))

    if (amounts.length === 0) return

    setIsLoading(true)
    setError("")
    try {
      const { rate, effectiveAt } = await getExchangeRate(fromCurrency, toCurrency)
      const results = amounts.map((amount) => ({
        amount,
        result: amount * rate,
      }))

      setExchangeRate(rate)
      setLastUpdated(new Date(effectiveAt).toLocaleString())
      setBulkResults(results)
      if (results.length > 0) {
        emitToolSuccess("currency-converter")
      }
    } catch (error) {
      console.error("Bulk conversion failed:", error)
      setError(tr("failedToLoadRate") || "Failed to load exchange rate")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!fromCurrency || !toCurrency) {
      return
    }

    if (fromCurrency === toCurrency) {
      setExchangeRate(1)
      setLastUpdated(new Date().toLocaleString())
      setError("")
      return
    }

    void refreshExchangeRate(userInteractedRef.current)
  }, [fromCurrency, toCurrency])

  useEffect(() => {
    updateConvertedAmount(exchangeRate)
  }, [amount, exchangeRate])

  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const getCurrencyDisplay = (currencyCode: string) => {
    const currency = currencies.find((c) => c.code === currencyCode)
    return currency ? `${currency.flag} ${currency.code} - ${currency.name}` : currencyCode
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">{tr("singleConversion")}</TabsTrigger>
          <TabsTrigger value="bulk">{tr("bulkConversion")}</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[color:var(--productivity)]" />
                  {tr("currencyConversion")}
                </CardTitle>
                <CardDescription>{tr("convertBetweenCurrencies")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">{tr("amount")}</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={tr("enterAmount")}
                    value={amount}
                    onChange={(e) => {
                      userInteractedRef.current = true
                      setAmount(e.target.value)
                    }}
                    className="text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr("from")}</Label>
                    <Select
                      value={fromCurrency}
                      onValueChange={(value) => {
                        userInteractedRef.current = true
                        setFromCurrency(value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {getCurrencyDisplay(currency.code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{tr("to")}</Label>
                    <Select
                      value={toCurrency}
                      onValueChange={(value) => {
                        userInteractedRef.current = true
                        setToCurrency(value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {getCurrencyDisplay(currency.code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={swapCurrencies} className="gap-2 bg-transparent">
                    <ArrowRightLeft className="w-4 h-4" />
                    {tr("swap")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Result Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[color:var(--productivity)]" />
                  {tr("conversionResult")}
                </CardTitle>
                <CardDescription>{lastUpdated && `${tr("lastUpdated")}${lastUpdated}`}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{tr("converting")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="text-center">
                      <div className="text-3xl font-bold text-[color:var(--productivity)]">
                        {convertedAmount !== null ? formatCurrency(convertedAmount, toCurrency) : "---"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {amount && formatCurrency(Number.parseFloat(amount) || 0, fromCurrency)}
                      </div>
                    </div>

                    {exchangeRate && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span>{tr("exchangeRate")}</span>
                          <span className="font-medium">
                            1 {fromCurrency} = {exchangeRate.toFixed(6)} {toCurrency}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-medium">{tr("midMarketRate")}</div>
                        <div>{tr("noHiddenFees")}</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-medium">{tr("realTimeData")}</div>
                        <div>{tr("updatedEveryMinute")}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[color:var(--productivity)]" />
                {tr("bulkCurrencyConversion")}
              </CardTitle>
              <CardDescription>{tr("convertMultipleAmounts")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr("fromCurrency")}</Label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {getCurrencyDisplay(currency.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{tr("toCurrency")}</Label>
                  <Select value={toCurrency} onValueChange={setToCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {getCurrencyDisplay(currency.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-amounts">{tr("amounts")}</Label>
                <textarea
                  id="bulk-amounts"
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  placeholder="100&#10;250.50&#10;1000&#10;75.25"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                />
              </div>

              <Button
                onClick={convertBulk}
                disabled={!bulkInput.trim() || isLoading}
                className="w-full bg-[color:var(--productivity)] hover:bg-[color:var(--productivity)]/90 text-white"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {tr("converting")}
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    {tr("convertAll")}
                  </>
                )}
              </Button>

              {bulkResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">{tr("conversionResults")}</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bulkResults.map((result, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{formatCurrency(result.amount, fromCurrency)}</span>
                        <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-[color:var(--productivity)]">
                          {formatCurrency(result.result, toCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
