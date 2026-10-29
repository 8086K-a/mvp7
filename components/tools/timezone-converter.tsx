"use client"

import { useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, Globe, Calendar, Plus, Trash2, Copy, CheckCircle } from "lucide-react"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface TimeZone {
  id: string
  name: string
  offset: string
  city: string
}

interface WorldClock {
  id: string
  timezone: string
  label: string
}

interface TimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getTimeZoneParts(date: Date, timezone: string): TimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  })

  const parts = formatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0)

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  }
}

function getTimeZoneOffsetMinutes(date: Date, timezone: string) {
  const parts = getTimeZoneParts(date, timezone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return Math.round((asUtc - date.getTime()) / 60000)
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function formatOffsetLabel(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absoluteMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  return `UTC${sign}${pad(hours)}:${pad(minutes)}`
}

function createUtcDateFromLocalInput(sourceDate: string, sourceTime: string, timezone: string) {
  const [year, month, day] = sourceDate.split("-").map((value) => Number.parseInt(value, 10))
  const [hour, minute] = sourceTime.split(":").map((value) => Number.parseInt(value, 10))

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null
  }

  const targetLocalUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let offsetMinutes = getTimeZoneOffsetMinutes(new Date(targetLocalUtc), timezone)
  let timestamp = targetLocalUtc - offsetMinutes * 60 * 1000

  const recalculatedOffset = getTimeZoneOffsetMinutes(new Date(timestamp), timezone)
  if (recalculatedOffset !== offsetMinutes) {
    offsetMinutes = recalculatedOffset
    timestamp = targetLocalUtc - offsetMinutes * 60 * 1000
  }

  return new Date(timestamp)
}

function formatInTimezone(date: Date, timezone: string) {
  const parts = getTimeZoneParts(date, timezone)
  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
    fullDate: new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
  }
}

export function TimezoneConverter() {
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `timezoneConverterTool.${key}`)
  
  const [sourceTime, setSourceTime] = useState("")
  const [sourceDate, setSourceDate] = useState("")
  const [sourceTimezone, setSourceTimezone] = useState("UTC")
  const [targetTimezone, setTargetTimezone] = useState("America/New_York")
  const [worldClocks, setWorldClocks] = useState<WorldClock[]>([
    { id: "1", timezone: "America/New_York", label: "New York" },
    { id: "2", timezone: "Europe/London", label: "London" },
    { id: "3", timezone: "Asia/Tokyo", label: "Tokyo" },
  ])
  const [newClockTimezone, setNewClockTimezone] = useState("")
  const [newClockLabel, setNewClockLabel] = useState("")
  const [copiedTime, setCopiedTime] = useState<string | null>(null)

  const timezones: TimeZone[] = [
    { id: "UTC", name: "UTC", offset: "+00:00", city: "Coordinated Universal Time" },
    { id: "America/New_York", name: "EST/EDT", offset: "-05:00", city: "New York" },
    { id: "America/Chicago", name: "CST/CDT", offset: "-06:00", city: "Chicago" },
    { id: "America/Denver", name: "MST/MDT", offset: "-07:00", city: "Denver" },
    { id: "America/Los_Angeles", name: "PST/PDT", offset: "-08:00", city: "Los Angeles" },
    { id: "Europe/London", name: "GMT/BST", offset: "+00:00", city: "London" },
    { id: "Europe/Paris", name: "CET/CEST", offset: "+01:00", city: "Paris" },
    { id: "Europe/Berlin", name: "CET/CEST", offset: "+01:00", city: "Berlin" },
    { id: "Asia/Tokyo", name: "JST", offset: "+09:00", city: "Tokyo" },
    { id: "Asia/Shanghai", name: "CST", offset: "+08:00", city: "Shanghai" },
    { id: "Asia/Dubai", name: "GST", offset: "+04:00", city: "Dubai" },
    { id: "Australia/Sydney", name: "AEST/AEDT", offset: "+10:00", city: "Sydney" },
  ]

  const convertTime = () => {
    if (!sourceTime || !sourceDate) return null

    try {
      const sourceDateTime = createUtcDateFromLocalInput(sourceDate, sourceTime, sourceTimezone)
      const sourceTimezoneObj = timezones.find((tz) => tz.id === sourceTimezone)
      const targetTimezoneObj = timezones.find((tz) => tz.id === targetTimezone)

      if (!sourceDateTime) {
        return null
      }

      const convertedTime = formatInTimezone(sourceDateTime, targetTimezone)

      return {
        date: convertedTime.date,
        time: convertedTime.time,
        timezone: `${targetTimezoneObj?.city || targetTimezone} (${targetTimezoneObj?.name || targetTimezoneObj?.id || targetTimezone}) ${formatOffsetLabel(getTimeZoneOffsetMinutes(sourceDateTime, targetTimezone))}`,
        sourceTimezone: `${sourceTimezoneObj?.city || sourceTimezone} (${sourceTimezoneObj?.name || sourceTimezone}) ${formatOffsetLabel(getTimeZoneOffsetMinutes(sourceDateTime, sourceTimezone))}`,
      }
    } catch (error) {
      return null
    }
  }

  const getCurrentTimeInTimezone = (timezoneId: string) => {
    const now = new Date()
    const timezone = timezones.find((tz) => tz.id === timezoneId)
    if (!timezone) return { time: "00:00", date: "N/A" }

    const localTime = formatInTimezone(now, timezone.id)

    return {
      time: localTime.time,
      date: localTime.fullDate,
    }
  }

  const getTimezoneDisplay = (timezoneId: string, referenceDate = new Date()) => {
    const timezone = timezones.find((tz) => tz.id === timezoneId)
    if (!timezone) {
      return timezoneId
    }

    return `${timezone.city} (${timezone.name}) ${formatOffsetLabel(getTimeZoneOffsetMinutes(referenceDate, timezoneId))}`
  }

  const addWorldClock = () => {
    if (!newClockTimezone || !newClockLabel) return

    const newClock: WorldClock = {
      id: Date.now().toString(),
      timezone: newClockTimezone,
      label: newClockLabel,
    }

    setWorldClocks((prev) => [...prev, newClock])
    setNewClockTimezone("")
    setNewClockLabel("")
  }

  const removeWorldClock = (id: string) => {
    setWorldClocks((prev) => prev.filter((clock) => clock.id !== id))
  }

  const copyTime = async (timeString: string) => {
    try {
      await navigator.clipboard.writeText(timeString)
      setCopiedTime(timeString)
      setTimeout(() => setCopiedTime(null), 2000)
      emitToolSuccess("timezone-converter")
    } catch (error) {
      console.error("Failed to copy time:", error)
    }
  }

  const convertedResult = convertTime()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-[color:var(--productivity)]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[color:var(--productivity)]" />
              <CardTitle className="text-lg">{tr("converter")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tr("active")}</div>
            <p className="text-sm text-muted-foreground">{tr("timeConversion")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">{tr("worldClocks")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{worldClocks.length}</div>
            <p className="text-sm text-muted-foreground">{tr("timeZones")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">{tr("current")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date().toTimeString().slice(0, 5)}</div>
            <p className="text-sm text-muted-foreground">{tr("localTime")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Converter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {tr("timeZoneConverter")}
            </CardTitle>
            <CardDescription>{tr("convertTimeBetweenTimeZones")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-date">{tr("date")}</Label>
                <Input
                  id="source-date"
                  type="date"
                  value={sourceDate}
                  onChange={(e) => setSourceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-time">{tr("time")}</Label>
                <Input
                  id="source-time"
                  type="time"
                  value={sourceTime}
                  onChange={(e) => setSourceTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{tr("sourceTimeZone")}</Label>
              <Select value={sourceTimezone} onValueChange={setSourceTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.id} value={tz.id}>
                      {getTimezoneDisplay(tz.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tr("targetTimeZone")}</Label>
              <Select value={targetTimezone} onValueChange={setTargetTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.id} value={tz.id}>
                      {getTimezoneDisplay(tz.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {convertedResult && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tr("convertedTime")}</p>
                    <p className="text-lg font-bold">
                      {convertedResult.date} {convertedResult.time}
                    </p>
                    <p className="text-sm text-muted-foreground">{convertedResult.sourceTimezone}</p>
                    <p className="text-sm text-muted-foreground">{convertedResult.timezone}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyTime(`${convertedResult.date} ${convertedResult.time}`)}
                  >
                    {copiedTime === `${convertedResult.date} ${convertedResult.time}` ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* World Clock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {tr("worldClocks")}
            </CardTitle>
            <CardDescription>{t(language, "tools.timezoneConverter.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {worldClocks.map((clock) => {
                const currentTime = getCurrentTimeInTimezone(clock.timezone)
                const timezone = timezones.find((tz) => tz.id === clock.timezone)

                return (
                  <div key={clock.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{clock.label}</p>
                        <Badge variant="outline" className="text-xs">
                          {timezone ? formatOffsetLabel(getTimeZoneOffsetMinutes(new Date(), timezone.id)) : "UTC+00:00"}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold">{currentTime.time}</p>
                      <p className="text-xs text-muted-foreground">{currentTime.date}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyTime(`${clock.label}: ${currentTime.time}`)}
                      >
                        {copiedTime === `${clock.label}: ${currentTime.time}` ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeWorldClock(clock.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-clock-label">{tr("clockLabel")}</Label>
                <Input
                  id="new-clock-label"
                  value={newClockLabel}
                  onChange={(e) => setNewClockLabel(e.target.value)}
                  placeholder={tr("enterLabel")}
                />
              </div>
              <div className="space-y-2">
                <Label>{tr("selectTimeZone")}</Label>
                <Select value={newClockTimezone} onValueChange={setNewClockTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder={tr("selectTimeZone")} />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.id} value={tz.id}>
                        {getTimezoneDisplay(tz.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addWorldClock} disabled={!newClockLabel || !newClockTimezone} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {tr("addWorldClock")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Scheduler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {tr("meetingTimeFinder")}
          </CardTitle>
          <CardDescription>{tr("findBestMeetingTime")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "09:00", hour: 9 },
              { label: "13:00", hour: 13 },
              { label: "17:00", hour: 17 },
              { label: "21:00", hour: 21 },
            ].map((slot) => (
              <div key={slot.label} className="p-3 border rounded-lg">
                <p className="font-medium text-center mb-2">{slot.label} UTC</p>
                <div className="space-y-1">
                  {worldClocks.slice(0, 3).map((clock) => {
                    const utcDate = new Date()
                    utcDate.setUTCHours(slot.hour, 0, 0, 0)
                    const localTime = formatInTimezone(utcDate, clock.timezone)

                    return (
                      <div key={clock.id} className="text-xs">
                        <span className="text-muted-foreground">{clock.label}:</span> {localTime.time}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
