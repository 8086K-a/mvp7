"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type React from "react"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import jsPDF from "jspdf"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"
import {
  createTarArchive,
  detectFileFamily,
  fileToBytes,
  sanitizeFileName,
  splitBaseName,
  toHumanSize,
  triggerDownload,
  type FileFamily,
} from "@/lib/tools/universal-file-utils"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

type MergeStrategy = "auto" | "package"

type MergeFile = {
  id: string
  file: File
  family: FileFamily
}

type MergeResult = {
  blob: Blob
  fileName: string
  method: string
}

function createMergeFile(file: File): MergeFile {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    file,
    family: detectFileFamily(file),
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

function toUint8Array(data: Uint8Array | ArrayBuffer) {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

export function UniversalMergeStudio() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [files, setFiles] = useState<MergeFile[]>([])
  const [strategy, setStrategy] = useState<MergeStrategy>("auto")
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState("")
  const [engineLoading, setEngineLoading] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const ffmpegRef = useRef<FFmpeg | null>(null)

  const families = useMemo(() => Array.from(new Set(files.map((item) => item.family))), [files])
  const isAllImages = families.length === 1 && families[0] === "pics"
  const isAllVideo = families.length === 1 && families[0] === "video"
  const isAllAudio = families.length === 1 && families[0] === "audio"

  const mergeModeLabel = useMemo(() => {
    if (strategy === "package") return zh ? "打包合并（TAR）" : "Package merge (TAR)"
    if (isAllImages) return zh ? "图片合并为 PDF" : "Merge images to PDF"
    if (isAllVideo) return zh ? "视频合并为 MP4" : "Merge videos to MP4"
    if (isAllAudio) return zh ? "音频合并为 MP3" : "Merge audio to MP3"
    return zh ? "跨格式打包合并（TAR）" : "Cross-format package merge (TAR)"
  }, [isAllAudio, isAllImages, isAllVideo, strategy, zh])

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
  }, [engineLoading, engineReady])

  const mergeAsPackage = useCallback(
    async (rows: MergeFile[]): Promise<MergeResult> => {
      const encoder = new TextEncoder()
      const entries = []
      for (const row of rows) {
        const bytes = await fileToBytes(row.file)
        entries.push({
          name: sanitizeFileName(row.file.name),
          bytes,
          modifiedAt: new Date(row.file.lastModified || Date.now()),
        })
      }

      const manifest = {
        generatedAt: new Date().toISOString(),
        fileCount: rows.length,
        files: rows.map((row, index) => ({
          order: index + 1,
          fileName: row.file.name,
          family: row.family,
          size: row.file.size,
          mimeType: row.file.type || "application/octet-stream",
        })),
      }
      entries.push({
        name: "merge-manifest.json",
        bytes: encoder.encode(JSON.stringify(manifest, null, 2)),
      })

      const blob = createTarArchive(entries)
      return {
        blob,
        fileName: `merged-package-${Date.now()}.tar`,
        method: "tar-package",
      }
    },
    [],
  )

  const mergeImagesToPdf = useCallback(
    async (rows: MergeFile[]): Promise<MergeResult> => {
      const pdf = new jsPDF({ unit: "pt", format: "a4" })
      let isFirstPage = true

      for (const row of rows) {
        const image = await loadImageFromFile(row.file)
        const canvas = document.createElement("canvas")
        canvas.width = image.naturalWidth || image.width
        canvas.height = image.naturalHeight || image.height
        const context = canvas.getContext("2d")
        if (!context) throw new Error("Canvas context unavailable")
        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95)
        if (!isFirstPage) {
          pdf.addPage()
        }
        isFirstPage = false

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
        const drawWidth = canvas.width * scale
        const drawHeight = canvas.height * scale
        const x = (pageWidth - drawWidth) / 2
        const y = (pageHeight - drawHeight) / 2
        pdf.addImage(dataUrl, "JPEG", x, y, drawWidth, drawHeight)
      }

      const bytes = pdf.output("arraybuffer")
      return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        fileName: `merged-images-${Date.now()}.pdf`,
        method: "image-to-pdf",
      }
    },
    [],
  )

  const mergeMediaWithFfmpeg = useCallback(
    async (rows: MergeFile[], family: "video" | "audio"): Promise<MergeResult> => {
      await loadFfmpeg()
      if (!ffmpegRef.current) {
        throw new Error(zh ? "媒体合并引擎加载失败" : "Media engine failed to load")
      }
      const ffmpeg = ffmpegRef.current

      const inputNames: string[] = []
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]
        const { extension } = splitBaseName(row.file.name)
        const ext = extension || (family === "video" ? "mp4" : "mp3")
        const name = `input_${index}.${ext}`
        inputNames.push(name)
        await ffmpeg.writeFile(name, await fetchFile(row.file))
      }

      const listContent = inputNames.map((name) => `file '${name}'`).join("\n")
      const listName = "concat-list.txt"
      await ffmpeg.writeFile(listName, new TextEncoder().encode(listContent))

      const outputName = family === "video" ? `merged_${Date.now()}.mp4` : `merged_${Date.now()}.mp3`
      if (family === "video") {
        try {
          await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", listName, "-c", "copy", outputName])
        } catch {
          await ffmpeg.exec([
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            listName,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "24",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            outputName,
          ])
        }
      } else {
        try {
          await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", listName, "-c", "copy", outputName])
        } catch {
          await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", listName, "-codec:a", "libmp3lame", "-b:a", "192k", outputName])
        }
      }

      const outputBytes = toUint8Array(await ffmpeg.readFile(outputName))
      const blob = new Blob([outputBytes], { type: family === "video" ? "video/mp4" : "audio/mpeg" })

      try {
        await ffmpeg.deleteFile(listName)
        await ffmpeg.deleteFile(outputName)
        for (const name of inputNames) {
          await ffmpeg.deleteFile(name)
        }
      } catch {
        // ignore cleanup errors
      }

      return {
        blob,
        fileName: family === "video" ? `merged-video-${Date.now()}.mp4` : `merged-audio-${Date.now()}.mp3`,
        method: family === "video" ? "ffmpeg-video-merge" : "ffmpeg-audio-merge",
      }
    },
    [loadFfmpeg, zh],
  )

  const runMerge = async () => {
    if (files.length < 2 || working) return
    setWorking(true)
    setResult(null)
    setError("")
    setProgress(8)

    try {
      let output: MergeResult
      if (strategy === "package") {
        setProgress(40)
        output = await mergeAsPackage(files)
      } else if (isAllImages) {
        setProgress(40)
        output = await mergeImagesToPdf(files)
      } else if (isAllVideo) {
        setProgress(20)
        output = await mergeMediaWithFfmpeg(files, "video")
      } else if (isAllAudio) {
        setProgress(20)
        output = await mergeMediaWithFfmpeg(files, "audio")
      } else {
        setProgress(40)
        output = await mergeAsPackage(files)
      }

      setProgress(100)
      setResult(output)
      emitToolSuccess("universal-file-merger")
    } catch (mergeError: any) {
      setError(mergeError?.message || (zh ? "合并失败" : "Merge failed"))
    } finally {
      setWorking(false)
    }
  }

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || [])
    if (picked.length === 0) return
    setFiles((current) => [...current, ...picked.map((file) => createMergeFile(file))])
    event.target.value = ""
  }

  const removeFile = (id: string) => {
    if (working) return
    setFiles((current) => current.filter((item) => item.id !== id))
  }

  const clearAll = () => {
    if (working) return
    setFiles([])
    setResult(null)
    setError("")
    setProgress(0)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{zh ? "全格式文件合并工具" : "Universal File Merger"}</CardTitle>
          <CardDescription>
            {zh
              ? "支持 Word / PDF / PPT / Excel / Pics / Video / Audio。图片可直接合并为 PDF，音视频可直接拼接，其他格式自动打包合并。"
              : "Supports Word / PDF / PPT / Excel / Pics / Video / Audio. Images can merge into PDF, media can be concatenated, and other formats are merged as a package."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{zh ? "选择多个文件（至少 2 个）" : "Select Multiple Files (At Least 2)"}</Label>
            <Input type="file" multiple onChange={onPickFiles} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{zh ? "合并策略" : "Merge Strategy"}</Label>
              <Select value={strategy} onValueChange={(value) => setStrategy(value as MergeStrategy)} disabled={working}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{zh ? "自动（推荐）" : "Auto (Recommended)"}</SelectItem>
                  <SelectItem value="package">{zh ? "统一打包合并（TAR）" : "Package Merge (TAR)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{zh ? "当前输出模式" : "Current Output"}</Label>
              <div className="h-10 rounded-md border px-3 flex items-center text-sm text-muted-foreground">{mergeModeLabel}</div>
            </div>
          </div>

          {working ? <Progress value={progress} /> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void runMerge()} disabled={files.length < 2 || working}>
              {working ? (zh ? "合并中..." : "Merging...") : zh ? "开始合并" : "Merge Files"}
            </Button>
            <Button variant="outline" onClick={clearAll} disabled={files.length === 0 || working}>
              {zh ? "清空列表" : "Clear"}
            </Button>
            <MpDownloadButton
              blob={result?.blob}
              filename={result?.fileName || "merged.tar"}
              variant="outline"
              disabled={!result}
            />
            {engineLoading ? <Badge variant="secondary">{zh ? "媒体引擎加载中..." : "Loading media engine..."}</Badge> : null}
            {engineReady ? <Badge variant="secondary">{zh ? "媒体引擎已就绪" : "Media engine ready"}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{zh ? "文件列表" : "Files"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {files.length === 0 ? (
            <div className="text-sm text-muted-foreground">{zh ? "暂无文件" : "No files yet"}</div>
          ) : (
            files.map((item, index) => (
              <div key={item.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{index + 1}. {item.file.name}</div>
                  <div className="text-xs text-muted-foreground">{toHumanSize(item.file.size)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.family}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => removeFile(item.id)} disabled={working}>
                    {zh ? "移除" : "Remove"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>{zh ? "合并结果" : "Merge Result"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{zh ? "文件名" : "File Name"}: {result.fileName}</div>
            <div>{zh ? "大小" : "Size"}: {toHumanSize(result.blob.size)}</div>
            <div>{zh ? "方式" : "Method"}: {result.method}</div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}
    </div>
  )
}
