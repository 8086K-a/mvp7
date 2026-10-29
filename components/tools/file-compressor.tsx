"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Download, FileArchive, Upload } from "lucide-react"
import { toast } from "sonner"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

type CompressionAlgorithm = "gzip" | "deflate"

function toHumanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function FileCompressor() {
  const { language } = useLanguage()
  const [file, setFile] = useState<File | null>(null)
  const [algorithm, setAlgorithm] = useState<CompressionAlgorithm>("gzip")
  const [progress, setProgress] = useState(0)
  const [isCompressing, setIsCompressing] = useState(false)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultName, setResultName] = useState("")

  const zh = language === "zh"
  const hasCompressionStream = typeof CompressionStream !== "undefined"

  const ratioText = useMemo(() => {
    if (!file || !resultBlob || file.size <= 0) return "-"
    const ratio = ((1 - resultBlob.size / file.size) * 100).toFixed(1)
    return `${ratio}%`
  }, [file, resultBlob])

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0]
    setFile(next || null)
    setResultBlob(null)
    setResultName("")
    setProgress(0)
  }

  const handleCompress = async () => {
    if (!file) {
      toast.error(zh ? "请先选择文件" : "Please select a file first")
      return
    }
    if (!hasCompressionStream) {
      toast.error(zh ? "当前浏览器不支持压缩 API" : "Compression API is not supported by this browser")
      return
    }

    try {
      setIsCompressing(true)
      setProgress(15)

      const stream = file.stream().pipeThrough(new CompressionStream(algorithm))
      setProgress(60)
      const compressed = await new Response(stream).blob()
      setProgress(90)

      const extension = algorithm === "gzip" ? "gz" : "deflate"
      setResultBlob(compressed)
      setResultName(`${file.name}.${extension}`)
      setProgress(100)
      emitToolSuccess("file-compressor")

      toast.success(zh ? "压缩完成" : "Compression completed")
    } catch (error: any) {
      toast.error(zh ? `压缩失败：${error?.message || "未知错误"}` : `Compression failed: ${error?.message || "Unknown error"}`)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = resultName || "compressed.bin"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            {zh ? "文件压缩" : "File Compression"}
          </CardTitle>
          <CardDescription>
            {zh ? "使用浏览器本地压缩能力处理文件（不上传到服务器）" : "Compress files locally in browser (no server upload)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{zh ? "选择文件" : "Choose File"}</Label>
            <Input type="file" onChange={onPickFile} />
          </div>

          <div className="space-y-2">
            <Label>{zh ? "压缩算法" : "Algorithm"}</Label>
            <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as CompressionAlgorithm)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gzip">Gzip</SelectItem>
                <SelectItem value="deflate">Deflate</SelectItem>
              </SelectContent>
            </Select>
            {!hasCompressionStream ? (
              <p className="text-xs text-red-500">
                {zh ? "你的浏览器不支持 CompressionStream，请换 Chrome/Edge 最新版。" : "Your browser does not support CompressionStream. Use latest Chrome/Edge."}
              </p>
            ) : null}
          </div>

          {isCompressing ? <Progress value={progress} /> : null}

          <div className="flex gap-3">
            <Button onClick={handleCompress} disabled={!file || isCompressing || !hasCompressionStream}>
              <Upload className="w-4 h-4 mr-2" />
              {isCompressing ? (zh ? "压缩中..." : "Compressing...") : (zh ? "开始压缩" : "Start Compress")}
            </Button>
            <MpDownloadButton
              blob={resultBlob}
              filename={resultName || "compressed.bin"}
              disabled={!resultBlob}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{zh ? "结果信息" : "Result"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>{zh ? "原始大小" : "Original"}</span>
            <span>{file ? toHumanSize(file.size) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "压缩后" : "Compressed"}</span>
            <span>{resultBlob ? toHumanSize(resultBlob.size) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "压缩率" : "Ratio"}</span>
            <Badge variant="outline">{ratioText}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
