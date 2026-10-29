"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type React from "react"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useLanguage } from "@/components/language-provider"
import {
  buildFileName,
  compressWithStream,
  detectFileFamily,
  type FileFamily,
  splitBaseName,
  toHumanSize,
  triggerDownload,
} from "@/lib/tools/universal-file-utils"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

type CompressionMode = "smart" | "lossless"
type LosslessAlgorithm = "gzip" | "deflate"
type MediaPreset = "light" | "balanced" | "strong"

type CompressionRow = {
  id: string
  file: File
  family: FileFamily
  status: "pending" | "processing" | "done" | "error"
  progress: number
  outputBlob: Blob | null
  outputName: string
  method: string
  errorMessage: string
}

function createRow(file: File): CompressionRow {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    file,
    family: detectFileFamily(file),
    status: "pending",
    progress: 0,
    outputBlob: null,
    outputName: "",
    method: "",
    errorMessage: "",
  }
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    image.src = url
  })
}

async function compressImageSmart(file: File, quality: number) {
  const image = await loadImageFromFile(file)
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas context unavailable")
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg"
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mime, quality)
  })

  if (!blob) throw new Error("Failed to export image")
  const extension = mime === "image/png" ? "png" : "jpg"
  return {
    blob,
    fileName: buildFileName(file.name, "-compressed", extension),
    method: "smart-image",
  }
}

function parseBitratePreset(preset: MediaPreset) {
  if (preset === "light") {
    return { videoBitrate: "2200k", audioBitrate: "160k", crf: "24" }
  }
  if (preset === "strong") {
    return { videoBitrate: "900k", audioBitrate: "96k", crf: "31" }
  }
  return { videoBitrate: "1500k", audioBitrate: "128k", crf: "28" }
}

function toUint8Array(data: Uint8Array | ArrayBuffer) {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

export function UniversalCapacityReducer() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [rows, setRows] = useState<CompressionRow[]>([])
  const [mode, setMode] = useState<CompressionMode>("smart")
  const [losslessAlgorithm, setLosslessAlgorithm] = useState<LosslessAlgorithm>("gzip")
  const [imageQuality, setImageQuality] = useState([86])
  const [mediaPreset, setMediaPreset] = useState<MediaPreset>("balanced")
  const [working, setWorking] = useState(false)
  const [engineLoading, setEngineLoading] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const ffmpegRef = useRef<FFmpeg | null>(null)

  const overallProgress = useMemo(() => {
    if (rows.length === 0) return 0
    const sum = rows.reduce((total, row) => total + row.progress, 0)
    return Math.round(sum / rows.length)
  }, [rows])

  const updateRow = (id: string, patch: Partial<CompressionRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const loadFfmpeg = useCallback(async () => {
    if (engineReady || engineLoading) return
    setEngineLoading(true)
    try {
      const ffmpeg = new FFmpeg()
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      })
      ffmpegRef.current = ffmpeg
      setEngineReady(true)
    } finally {
      setEngineLoading(false)
    }
  }, [engineReady, engineLoading])

  const compressMediaSmart = useCallback(
    async (file: File, family: FileFamily) => {
      await loadFfmpeg()
      if (!ffmpegRef.current) {
        throw new Error(zh ? "媒体压缩引擎加载失败" : "Media engine failed to load")
      }

      const ffmpeg = ffmpegRef.current
      const { extension } = splitBaseName(file.name)
      const safeExtension = extension || (family === "video" ? "mp4" : "wav")
      const inputName = `input_${Date.now()}.${safeExtension}`
      await ffmpeg.writeFile(inputName, await fetchFile(file))

      const preset = parseBitratePreset(mediaPreset)

      if (family === "video") {
        const outputName = `output_${Date.now()}.mp4`
        try {
          await ffmpeg.exec([
            "-i",
            inputName,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            preset.crf,
            "-c:a",
            "aac",
            "-b:a",
            preset.audioBitrate,
            outputName,
          ])
        } catch {
          await ffmpeg.exec([
            "-i",
            inputName,
            "-b:v",
            preset.videoBitrate,
            "-b:a",
            preset.audioBitrate,
            outputName,
          ])
        }

        const outputBytes = toUint8Array(await ffmpeg.readFile(outputName))
        const blob = new Blob([outputBytes], { type: "video/mp4" })

        try {
          await ffmpeg.deleteFile(inputName)
          await ffmpeg.deleteFile(outputName)
        } catch {
          // ignore cleanup errors
        }

        return {
          blob,
          fileName: buildFileName(file.name, "-compressed", "mp4"),
          method: "smart-video",
        }
      }

      const outputName = `output_${Date.now()}.mp3`
      try {
        await ffmpeg.exec(["-i", inputName, "-codec:a", "libmp3lame", "-b:a", preset.audioBitrate, outputName])
      } catch {
        await ffmpeg.exec(["-i", inputName, "-c:a", "aac", "-b:a", preset.audioBitrate, outputName])
      }

      const outputBytes = toUint8Array(await ffmpeg.readFile(outputName))
      const blob = new Blob([outputBytes], { type: "audio/mpeg" })

      try {
        await ffmpeg.deleteFile(inputName)
        await ffmpeg.deleteFile(outputName)
      } catch {
        // ignore cleanup errors
      }

      return {
        blob,
        fileName: buildFileName(file.name, "-compressed", "mp3"),
        method: "smart-audio",
      }
    },
    [loadFfmpeg, mediaPreset, zh],
  )

  const processFile = useCallback(
    async (row: CompressionRow) => {
      const file = row.file
      const family = row.family

      if (mode === "lossless") {
        const blob = await compressWithStream(file, losslessAlgorithm)
        return {
          blob,
          fileName: buildFileName(file.name, "-reduced", losslessAlgorithm === "gzip" ? "gz" : "deflate"),
          method: losslessAlgorithm,
        }
      }

      if (family === "pics") {
        const smart = await compressImageSmart(file, imageQuality[0] / 100)
        if (smart.blob.size < file.size) return smart

        const lossless = await compressWithStream(file, "gzip")
        if (lossless.size < smart.blob.size) {
          return {
            blob: lossless,
            fileName: buildFileName(file.name, "-reduced", "gz"),
            method: "gzip-fallback",
          }
        }
        return smart
      }

      if (family === "video" || family === "audio") {
        try {
          const smart = await compressMediaSmart(file, family)
          if (smart.blob.size < file.size) return smart
        } catch {
          // fallback to lossless stream compression below
        }

        const lossless = await compressWithStream(file, "gzip")
        return {
          blob: lossless,
          fileName: buildFileName(file.name, "-reduced", "gz"),
          method: "gzip-fallback",
        }
      }

      const lossless = await compressWithStream(file, "gzip")
      return {
        blob: lossless,
        fileName: buildFileName(file.name, "-reduced", "gz"),
        method: "lossless-gzip",
      }
    },
    [compressMediaSmart, imageQuality, losslessAlgorithm, mode],
  )

  const runCompression = async () => {
    if (rows.length === 0 || working) return
    setWorking(true)
    let successCount = 0

    for (const row of rows) {
      try {
        updateRow(row.id, {
          status: "processing",
          progress: 10,
          errorMessage: "",
        })

        const result = await processFile(row)
        updateRow(row.id, {
          status: "done",
          progress: 100,
          outputBlob: result.blob,
          outputName: result.fileName,
          method: result.method,
        })
        successCount += 1
      } catch (error: any) {
        updateRow(row.id, {
          status: "error",
          progress: 100,
          errorMessage: error?.message || (zh ? "处理失败" : "Failed"),
        })
      }
    }

    if (successCount > 0) {
      emitToolSuccess("universal-capacity-reducer")
    }
    setWorking(false)
  }

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || [])
    if (nextFiles.length === 0) return
    setRows((current) => [...current, ...nextFiles.map((file) => createRow(file))])
    event.target.value = ""
  }

  const removeRow = (id: string) => {
    if (working) return
    setRows((current) => current.filter((row) => row.id !== id))
  }

  const resetRows = () => {
    if (working) return
    setRows([])
  }

  const finishedRows = rows.filter((row) => row.status === "done" && row.outputBlob)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{zh ? "全格式容量减小工具" : "Universal Capacity Reducer"}</CardTitle>
          <CardDescription>
            {zh
              ? "支持 Word / PDF / PPT / Excel / Pics / Video / Audio。图片与媒体走智能压缩，其他类型默认无损压缩。"
              : "Supports Word / PDF / PPT / Excel / Pics / Video / Audio. Images/media use smart compression and other formats use lossless compression."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{zh ? "选择文件" : "Select Files"}</Label>
            <Input type="file" multiple onChange={onPickFiles} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{zh ? "压缩模式" : "Mode"}</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as CompressionMode)} disabled={working}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">{zh ? "智能（推荐）" : "Smart (Recommended)"}</SelectItem>
                  <SelectItem value="lossless">{zh ? "无损流压缩" : "Lossless Stream Compression"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{zh ? "无损算法" : "Lossless Algorithm"}</Label>
              <Select
                value={losslessAlgorithm}
                onValueChange={(value) => setLosslessAlgorithm(value as LosslessAlgorithm)}
                disabled={working || mode !== "lossless"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gzip">Gzip</SelectItem>
                  <SelectItem value="deflate">Deflate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{zh ? "媒体压缩强度" : "Media Compression"}</Label>
              <Select value={mediaPreset} onValueChange={(value) => setMediaPreset(value as MediaPreset)} disabled={working}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{zh ? "轻度" : "Light"}</SelectItem>
                  <SelectItem value="balanced">{zh ? "平衡" : "Balanced"}</SelectItem>
                  <SelectItem value="strong">{zh ? "强压缩" : "Strong"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{zh ? `图片质量 ${imageQuality[0]}%` : `Image Quality ${imageQuality[0]}%`}</Label>
            <Slider value={imageQuality} onValueChange={setImageQuality} min={55} max={100} step={1} disabled={working} />
          </div>

          {working ? <Progress value={overallProgress} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void runCompression()} disabled={rows.length === 0 || working}>
              {working ? (zh ? "处理中..." : "Processing...") : zh ? "开始减小容量" : "Reduce Size"}
            </Button>
            <Button variant="outline" onClick={resetRows} disabled={rows.length === 0 || working}>
              {zh ? "清空列表" : "Clear"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                for (const row of finishedRows) {
                  triggerDownload(row.outputBlob as Blob, row.outputName)
                }
              }}
              disabled={finishedRows.length === 0 || working}
            >
              {zh ? "下载全部结果" : "Download All"}
            </Button>
            {engineLoading ? <Badge variant="secondary">{zh ? "媒体引擎加载中..." : "Loading media engine..."}</Badge> : null}
            {engineReady ? <Badge variant="secondary">{zh ? "媒体引擎已就绪" : "Media engine ready"}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{zh ? "处理明细" : "Results"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">{zh ? "还没有文件，请先上传。" : "No files yet. Please upload first."}</div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-medium">{row.file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {toHumanSize(row.file.size)}
                      {row.outputBlob ? ` -> ${toHumanSize(row.outputBlob.size)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{row.family}</Badge>
                    <Badge
                      variant={
                        row.status === "done" ? "default" : row.status === "error" ? "destructive" : "secondary"
                      }
                    >
                      {row.status}
                    </Badge>
                    {row.status === "done" && row.outputBlob ? (
                      <MpDownloadButton
                        blob={row.outputBlob}
                        filename={row.outputName}
                        size="sm"
                        variant="outline"
                      />
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => removeRow(row.id)} disabled={working}>
                      {zh ? "移除" : "Remove"}
                    </Button>
                  </div>
                </div>
                {row.method ? <div className="mt-2 text-xs text-muted-foreground">{zh ? "方式" : "Method"}: {row.method}</div> : null}
                {row.errorMessage ? <div className="mt-2 text-xs text-red-600">{row.errorMessage}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
