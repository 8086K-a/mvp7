"use client"

import React from "react"

import { useRef, useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, ArrowRightLeft, Ruler, Weight, Thermometer, Droplets, History, Copy, Trash2, Clock } from "lucide-react"
import { toast } from "sonner"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface Unit {
  name: string
  translationKey?: string
  symbol: string
  toBase: number // multiplier to convert to base unit
  fromBase: number // multiplier to convert from base unit
}

interface UnitCategory {
  name: string
  icon: React.ComponentType<{ className?: string }>
  baseUnit: string
  units: Unit[]
}

const unitCategories: UnitCategory[] = [
  {
    name: "Length",
    icon: Ruler,
    baseUnit: "meter",
    units: [
      { name: "Millimeter", translationKey: "millimeter", symbol: "mm", toBase: 0.001, fromBase: 1000 },
      { name: "Centimeter", translationKey: "centimeter", symbol: "cm", toBase: 0.01, fromBase: 100 },
      { name: "Meter", translationKey: "meter", symbol: "m", toBase: 1, fromBase: 1 },
      { name: "Kilometer", translationKey: "kilometer", symbol: "km", toBase: 1000, fromBase: 0.001 },
      { name: "Inch", translationKey: "inch", symbol: "in", toBase: 0.0254, fromBase: 39.3701 },
      { name: "Foot", translationKey: "foot", symbol: "ft", toBase: 0.3048, fromBase: 3.28084 },
      { name: "Yard", translationKey: "yard", symbol: "yd", toBase: 0.9144, fromBase: 1.09361 },
      { name: "Mile", translationKey: "mile", symbol: "mi", toBase: 1609.34, fromBase: 0.000621371 },
    ],
  },
  {
    name: "Weight",
    icon: Weight,
    baseUnit: "kilogram",
    units: [
      { name: "Milligram", translationKey: "milligram", symbol: "mg", toBase: 0.000001, fromBase: 1000000 },
      { name: "Gram", translationKey: "gram", symbol: "g", toBase: 0.001, fromBase: 1000 },
      { name: "Kilogram", translationKey: "kilogram", symbol: "kg", toBase: 1, fromBase: 1 },
      { name: "Pound", translationKey: "pound", symbol: "lb", toBase: 0.453592, fromBase: 2.20462 },
      { name: "Ounce", translationKey: "ounce", symbol: "oz", toBase: 0.0283495, fromBase: 35.274 },
      { name: "Stone", translationKey: "stone", symbol: "st", toBase: 6.35029, fromBase: 0.157473 },
      { name: "Ton (Metric)", translationKey: "tonMetric", symbol: "t", toBase: 1000, fromBase: 0.001 },
      { name: "Ton (US)", translationKey: "tonUS", symbol: "ton", toBase: 907.185, fromBase: 0.00110231 },
    ],
  },
  {
    name: "Temperature",
    icon: Thermometer,
    baseUnit: "celsius",
    units: [
      { name: "Celsius", translationKey: "celsius", symbol: "°C", toBase: 1, fromBase: 1 },
      { name: "Fahrenheit", translationKey: "fahrenheit", symbol: "°F", toBase: 1, fromBase: 1 },
      { name: "Kelvin", translationKey: "kelvin", symbol: "K", toBase: 1, fromBase: 1 },
      { name: "Rankine", translationKey: "rankine", symbol: "°R", toBase: 1, fromBase: 1 },
    ],
  },
  {
    name: "Volume",
    icon: Droplets,
    baseUnit: "liter",
    units: [
      { name: "Milliliter", translationKey: "milliliter", symbol: "ml", toBase: 0.001, fromBase: 1000 },
      { name: "Liter", translationKey: "liter", symbol: "l", toBase: 1, fromBase: 1 },
      { name: "Gallon (US)", translationKey: "gallonUS", symbol: "gal", toBase: 3.78541, fromBase: 0.264172 },
      { name: "Gallon (UK)", translationKey: "gallonUK", symbol: "gal", toBase: 4.54609, fromBase: 0.219969 },
      { name: "Quart (US)", translationKey: "quartUS", symbol: "qt", toBase: 0.946353, fromBase: 1.05669 },
      { name: "Pint (US)", translationKey: "pintUS", symbol: "pt", toBase: 0.473176, fromBase: 2.11338 },
      { name: "Cup (US)", translationKey: "cupUS", symbol: "cup", toBase: 0.236588, fromBase: 4.22675 },
      { name: "Fluid Ounce (US)", translationKey: "fluidOunceUS", symbol: "fl oz", toBase: 0.0295735, fromBase: 33.814 },
    ],
  },
]

export function UnitConverter() {
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `unitConverterTool.${key}`)
  
  const [selectedCategory, setSelectedCategory] = useState("Length")
  const [fromUnit, setFromUnit] = useState("Meter")
  const [toUnit, setToUnit] = useState("Foot")
  const [inputValue, setInputValue] = useState("1")
  const [result, setResult] = useState<number | null>(null)
  const userInteractedRef = useRef(false)

  const currentCategory = unitCategories.find((cat) => cat.name === selectedCategory)!
  const fromUnitData = currentCategory.units.find((unit) => unit.name === fromUnit)!
  const toUnitData = currentCategory.units.find((unit) => unit.name === toUnit)!

  const convertValue = (value: number, from: Unit, to: Unit, category: string): number => {
    if (category === "Temperature") {
      return convertTemperature(value, from.name, to.name)
    }

    // Convert to base unit, then to target unit
    const baseValue = value * from.toBase
    return baseValue * to.fromBase
  }

  const convertTemperature = (value: number, from: string, to: string): number => {
    // Convert to Celsius first
    let celsius = value
    if (from === "Fahrenheit") {
      celsius = ((value - 32) * 5) / 9
    } else if (from === "Kelvin") {
      celsius = value - 273.15
    } else if (from === "Rankine") {
      celsius = ((value - 491.67) * 5) / 9
    }

    // Convert from Celsius to target
    if (to === "Fahrenheit") {
      return (celsius * 9) / 5 + 32
    } else if (to === "Kelvin") {
      return celsius + 273.15
    } else if (to === "Rankine") {
      return (celsius * 9) / 5 + 491.67
    }

    return celsius
  }

  const handleConvert = () => {
    const value = Number.parseFloat(inputValue)
    if (isNaN(value)) {
      setResult(null)
      return
    }

    const converted = convertValue(value, fromUnitData, toUnitData, selectedCategory)
    setResult(converted)
    if (userInteractedRef.current) {
      emitToolSuccess("unit-converter")
      userInteractedRef.current = false
    }
  }

  const swapUnits = () => {
    userInteractedRef.current = true
    setFromUnit(toUnit)
    setToUnit(fromUnit)
    if (result !== null) {
      setInputValue(result.toString())
      setResult(Number.parseFloat(inputValue))
    }
  }

  const handleCategoryChange = (category: string) => {
    userInteractedRef.current = true
    setSelectedCategory(category)
    const newCategory = unitCategories.find((cat) => cat.name === category)!
    setFromUnit(newCategory.units[0].name)
    setToUnit(newCategory.units[1].name)
    setResult(null)
  }

  // Auto-convert when inputs change
  React.useEffect(() => {
    handleConvert()
  }, [inputValue, fromUnit, toUnit, selectedCategory])

  const formatResult = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return value.toExponential(6)
    } else if (Math.abs(value) < 0.001 && value !== 0) {
      return value.toExponential(6)
    } else {
      return value.toFixed(8).replace(/\.?0+$/, "")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    emitToolSuccess("unit-converter")
    toast.success("Copied to clipboard")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Tabs value={selectedCategory} onValueChange={handleCategoryChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
          {unitCategories.map((category) => {
            const Icon = category.icon
            const isSelected = selectedCategory === category.name
            return (
              <TabsTrigger
                key={category.name}
                value={category.name}
                className={`gap-2 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all`}
              >
                <Icon className="w-4 h-4" />
                {tr(category.name.toLowerCase())}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <Card className="border-2 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b bg-muted/10">
            <CardTitle className="text-xl flex items-center gap-2">
              {React.createElement(currentCategory.icon, { className: "w-5 h-5 text-primary" })}
              {tr(currentCategory.name.toLowerCase())}
            </CardTitle>
            <CardDescription>
              {tr("from")} {tr(fromUnitData.translationKey || fromUnitData.name.toLowerCase())} {tr("to")} {tr(toUnitData.translationKey || toUnitData.name.toLowerCase())}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Input Row */}
            <div className="space-y-2">
              <Label className="text-muted-foreground ml-1" htmlFor="input-val">{tr("enterValue")}</Label>
              <div className="relative">
                <Input
                  id="input-val"
                  type="number"
                  value={inputValue}
                  onChange={(e) => {
                    userInteractedRef.current = true
                    setInputValue(e.target.value)
                  }}
                  className="h-16 text-3xl font-mono px-4 shadow-sm"
                  placeholder="0"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium bg-muted/30 px-2 py-1 rounded">
                  {fromUnitData.symbol}
                </div>
              </div>
            </div>

            {/* Selection Row */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 sm:gap-4 items-center">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{tr("from")}</Label>
                <Select
                  value={fromUnit}
                  onValueChange={(value) => {
                    userInteractedRef.current = true
                    setFromUnit(value)
                  }}
                >
                  <SelectTrigger className="h-12 bg-muted/10 border-0 ring-1 ring-inset ring-border hover:bg-muted/20 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategory.units.map((unit) => (
                      <SelectItem key={unit.name} value={unit.name}>
                        <span className="font-medium">{tr(unit.translationKey || unit.name.toLowerCase())}</span>
                        <span className="ml-2 text-muted-foreground text-xs">({unit.symbol})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" size="icon" onClick={swapUnits} className="mt-6 rounded-full hover:bg-muted active:scale-95 transition-all">
                <ArrowRightLeft className="w-5 h-5" />
              </Button>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{tr("to")}</Label>
                <Select
                  value={toUnit}
                  onValueChange={(value) => {
                    userInteractedRef.current = true
                    setToUnit(value)
                  }}
                >
                  <SelectTrigger className="h-12 bg-muted/10 border-0 ring-1 ring-inset ring-border hover:bg-muted/20 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategory.units.map((unit) => (
                      <SelectItem key={unit.name} value={unit.name}>
                        <span className="font-medium">{tr(unit.translationKey || unit.name.toLowerCase())}</span>
                        <span className="ml-2 text-muted-foreground text-xs">({unit.symbol})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Result Display */}
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 relative group transition-all hover:bg-primary/10 hover:shadow-inner">
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-between">
                <span>{tr("result")}</span>
                <span className="text-xs bg-background/50 px-2 py-0.5 rounded text-foreground/70">
                  1 {fromUnitData.symbol} = {formatResult(convertValue(1, fromUnitData, toUnitData, selectedCategory))} {toUnitData.symbol}
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-bold tracking-tight text-primary truncate pr-12 font-mono" title={result?.toString()}>
                {result !== null ? formatResult(result) : "---"}
              </div>
              <div className="text-lg text-muted-foreground font-medium mt-1">
                {tr(toUnitData.translationKey || toUnitData.name.toLowerCase())}
              </div>

              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => result !== null && copyToClipboard(result.toString())}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}
