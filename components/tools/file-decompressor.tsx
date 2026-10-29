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

type DecompressionAlgorithm = "auto" | "gzip" | "deflate"

function toHumanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function detectAlgorithmFromName(fileName: string): DecompressionAlgorithm {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".gz") || lower.endsWith(".gzip")) return "gzip"
  if (lower.endsWith(".deflate") || lower.endsWith(".zz")) return "deflate"
  return "auto"
}

function detectAlgorithmFromBytes(bytes: Uint8Array): DecompressionAlgorithm {
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return "gzip"
  }

  if (bytes.length >= 2) {
    const cmf = bytes[0]
    const flg = bytes[1]
    const isLikelyZlib = cmf === 0x78 && ((cmf << 8) + flg) % 31 === 0
    if (isLikelyZlib) return "deflate"
  }

  return "auto"
}

async function decompressWithAlgorithm(file: File, algorithm: "gzip" | "deflate") {
  const stream = file.stream().pipeThrough(new DecompressionStream(algorithm))
  return new Response(stream).blob()
}

function buildOutputName(fileName: string, algorithm: DecompressionAlgorithm) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".gz")) return fileName.slice(0, -3)
  if (lower.endsWith(".gzip")) return fileName.slice(0, -5)
  if (lower.endsWith(".deflate")) return fileName.slice(0, -8)
  if (lower.endsWith(".zz")) return fileName.slice(0, -3)
  return algorithm === "deflate" ? `${fileName}.bin` : `${fileName}.out`
}

export function FileDecompressor() {
  const { language } = useLanguage()
  const [file, setFile] = useState<File | null>(null)
  const [algorithm, setAlgorithm] = useState<DecompressionAlgorithm>("auto")
  const [progress, setProgress] = useState(0)
  const [isWorking, setIsWorking] = useState(false)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultName, setResultName] = useState("")

  const zh = language === "zh"
  const hasDecompressionStream = typeof DecompressionStream !== "undefined"

  const resultRatio = useMemo(() => {
    if (!file || !resultBlob || file.size <= 0) return "-"
    const ratio = ((resultBlob.size / file.size) * 100).toFixed(1)
    return `${ratio}%`
  }, [file, resultBlob])

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0]
    setFile(next || null)
    setResultBlob(null)
    setResultName("")
    setProgress(0)
  }

  const handleDecompress = async () => {
    if (!file) {
      toast.error(zh ? "请先选择文件" : "Please select a file first")
      return
    }
    if (!hasDecompressionStream) {
      toast.error(zh ? "当前浏览器不支持解压 API" : "Decompression API is not supported by this browser")
      return
    }
    if (file.name.toLowerCase().endsWith(".zip")) {
      toast.error(zh ? "暂不支持 ZIP，请使用 Gzip/Deflate 文件" : "ZIP is not supported. Please use Gzip/Deflate files")
      return
    }

    try {
      setIsWorking(true)
      setProgress(15)

      const byName = detectAlgorithmFromName(file.name)
      const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
      const byBytes = detectAlgorithmFromBytes(head)

      const finalAlgorithm = algorithm !== "auto" ? algorithm : (byBytes !== "auto" ? byBytes : byName)

      const tryOrder: Array<"gzip" | "deflate"> =
        finalAlgorithm === "auto"
          ? ["gzip", "deflate"]
          : [finalAlgorithm, finalAlgorithm === "gzip" ? "deflate" : "gzip"]

      let decompressed: Blob | null = null
      let usedAlgorithm: "gzip" | "deflate" | null = null
      let lastError: any = null

      for (let index = 0; index < tryOrder.length; index++) {
        const current = tryOrder[index]
        try {
          setProgress(40 + index * 20)
          decompressed = await decompressWithAlgorithm(file, current)
          usedAlgorithm = current
          break
        } catch (error) {
          lastError = error
        }
      }

      if (!decompressed || !usedAlgorithm) {
        throw lastError || new Error(zh ? "无法识别压缩格式（仅支持 Gzip/Deflate）" : "Unsupported format (Gzip/Deflate only)")
      }

      setProgress(90)
      setResultBlob(decompressed)
      setResultName(buildOutputName(file.name, usedAlgorithm))
      setProgress(100)
      emitToolSuccess("file-decompressor")
      toast.success(zh ? "解压完成" : "Decompression completed")
    } catch (error: any) {
      toast.error(zh ? `解压失败：${error?.message || "未知错误"}` : `Decompression failed: ${error?.message || "Unknown error"}`)
    } finally {
      setIsWorking(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = resultName || "decompressed.bin"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            {zh ? "文件解压" : "File Decompression"}
          </CardTitle>
          <CardDescription>
            {zh ? "支持 Gzip/Deflate，本地浏览器处理。" : "Supports Gzip/Deflate locally in browser."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{zh ? "选择压缩文件" : "Choose Compressed File"}</Label>
            <Input type="file" onChange={onPickFile} />
          </div>

          <div className="space-y-2">
            <Label>{zh ? "解压算法" : "Algorithm"}</Label>
            <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as DecompressionAlgorithm)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{zh ? "自动识别" : "Auto Detect"}</SelectItem>
                <SelectItem value="gzip">Gzip</SelectItem>
                <SelectItem value="deflate">Deflate</SelectItem>
              </SelectContent>
            </Select>
            {!hasDecompressionStream ? (
              <p className="text-xs text-red-500">
                {zh ? "你的浏览器不支持 DecompressionStream，请换 Chrome/Edge 最新版。" : "Your browser does not support DecompressionStream. Use latest Chrome/Edge."}
              </p>
            ) : null}
          </div>

          {isWorking ? <Progress value={progress} /> : null}

          <div className="flex gap-3">
            <Button onClick={handleDecompress} disabled={!file || isWorking || !hasDecompressionStream}>
              <Upload className="w-4 h-4 mr-2" />
              {isWorking ? (zh ? "解压中..." : "Decompressing...") : (zh ? "开始解压" : "Start Decompress")}
            </Button>
            <MpDownloadButton
              blob={resultBlob}
              filename={resultName || "decompressed.bin"}
              variant="outline"
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
            <span>{zh ? "压缩文件" : "Compressed"}</span>
            <span>{file ? toHumanSize(file.size) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "解压后" : "Decompressed"}</span>
            <span>{resultBlob ? toHumanSize(resultBlob.size) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "体积比" : "Size Ratio"}</span>
            <Badge variant="outline">{resultRatio}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
