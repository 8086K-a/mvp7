"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/components/language-provider"
import {
  buildFileName,
  createTarArchive,
  detectFileFamily,
  fileToBytes,
  sanitizeFileName,
  sha256Hex,
  toHumanSize,
  triggerDownload,
  type FileFamily,
} from "@/lib/tools/universal-file-utils"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

type SignatureFile = {
  id: string
  file: File
  family: FileFamily
}

type ManifestRow = {
  fileName: string
  family: FileFamily
  outputName: string
  originalSize: number
  outputSize: number
  originalSha256: string
  outputSha256: string
  visualSignatureApplied: boolean
}

function createSignatureFile(file: File): SignatureFile {
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

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = String(text || "").split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

async function renderSignedImage(inputFile: File, signatureImageFile: File | null, signerName: string, note: string) {
  const sourceImage = await loadImageFromFile(inputFile)
  const canvas = document.createElement("canvas")
  canvas.width = sourceImage.naturalWidth || sourceImage.width
  canvas.height = sourceImage.naturalHeight || sourceImage.height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas context unavailable")

  context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height)

  const boxPadding = Math.max(10, Math.round(canvas.width * 0.015))
  const boxWidth = Math.min(Math.round(canvas.width * 0.44), canvas.width - boxPadding * 2)
  const defaultFontSize = Math.max(14, Math.round(canvas.width * 0.022))
  const signatureDate = new Date().toLocaleString()

  context.font = `${defaultFontSize}px sans-serif`
  const signerLabel = `Signer: ${signerName || "Unknown"}`
  const noteLines = wrapText(context, note || "-", boxWidth - boxPadding * 2)
  const dateLabel = `Time: ${signatureDate}`
  const textLineHeight = Math.round(defaultFontSize * 1.4)

  let signatureImageHeight = 0
  let signatureImage: HTMLImageElement | null = null
  if (signatureImageFile) {
    signatureImage = await loadImageFromFile(signatureImageFile)
    signatureImageHeight = Math.round(Math.min(canvas.height * 0.14, 90))
  }

  const textLines = [signerLabel, ...noteLines.slice(0, 4), dateLabel]
  const boxHeight = boxPadding * 2 + textLines.length * textLineHeight + (signatureImage ? signatureImageHeight + 8 : 0)

  const x = canvas.width - boxWidth - boxPadding
  const y = canvas.height - boxHeight - boxPadding

  context.fillStyle = "rgba(0, 0, 0, 0.45)"
  context.fillRect(x, y, boxWidth, boxHeight)
  context.strokeStyle = "rgba(255, 255, 255, 0.55)"
  context.lineWidth = 1
  context.strokeRect(x, y, boxWidth, boxHeight)

  let cursorY = y + boxPadding + textLineHeight
  context.fillStyle = "#ffffff"
  context.font = `${defaultFontSize}px sans-serif`
  for (const line of textLines) {
    context.fillText(line, x + boxPadding, cursorY)
    cursorY += textLineHeight
  }

  if (signatureImage) {
    const ratio = signatureImage.naturalWidth / Math.max(1, signatureImage.naturalHeight)
    const drawHeight = signatureImageHeight
    const drawWidth = Math.min(Math.round(drawHeight * ratio), boxWidth - boxPadding * 2)
    const drawX = x + boxWidth - boxPadding - drawWidth
    const drawY = y + boxHeight - boxPadding - drawHeight
    context.drawImage(signatureImage, drawX, drawY, drawWidth, drawHeight)
  }

  const outputType = inputFile.type === "image/png" ? "image/png" : "image/jpeg"
  const outputBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.95)
  })
  if (!outputBlob) throw new Error("Failed to export signed image")

  const extension = outputType === "image/png" ? "png" : "jpg"
  return {
    blob: outputBlob,
    fileName: buildFileName(inputFile.name, "-signed", extension),
  }
}

export function UniversalSignatureStudio() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [files, setFiles] = useState<SignatureFile[]>([])
  const [signerName, setSignerName] = useState("")
  const [signNote, setSignNote] = useState("")
  const [signatureImageFile, setSignatureImageFile] = useState<File | null>(null)
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultFileName, setResultFileName] = useState("")
  const [manifestRows, setManifestRows] = useState<ManifestRow[]>([])

  const grouped = useMemo(() => {
    return files.reduce<Record<string, number>>((summary, item) => {
      summary[item.family] = (summary[item.family] || 0) + 1
      return summary
    }, {})
  }, [files])

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || [])
    if (picked.length === 0) return
    setFiles((current) => [...current, ...picked.map((file) => createSignatureFile(file))])
    event.target.value = ""
  }

  const onPickSignatureImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSignatureImageFile(file)
    event.target.value = ""
  }

  const clearAll = () => {
    if (working) return
    setFiles([])
    setError("")
    setProgress(0)
    setResultBlob(null)
    setResultFileName("")
    setManifestRows([])
  }

  const removeFile = (id: string) => {
    if (working) return
    setFiles((current) => current.filter((item) => item.id !== id))
  }

  const runSign = async () => {
    if (files.length === 0 || working) return
    setWorking(true)
    setProgress(5)
    setError("")
    setResultBlob(null)
    setResultFileName("")
    setManifestRows([])

    try {
      const archiveEntries: Array<{ name: string; bytes: Uint8Array; modifiedAt?: Date }> = []
      const records: ManifestRow[] = []
      const signer = signerName.trim() || (zh ? "未命名签署人" : "Unnamed signer")
      const note = signNote.trim() || (zh ? "无附加说明" : "No additional note")

      for (let index = 0; index < files.length; index += 1) {
        const row = files[index]
        const originalBytes = await fileToBytes(row.file)
        const originalSha256 = await sha256Hex(originalBytes)

        let outputBlob: Blob
        let outputName: string
        let visualSignatureApplied = false

        if (row.family === "pics") {
          const signed = await renderSignedImage(row.file, signatureImageFile, signer, note)
          outputBlob = signed.blob
          outputName = signed.fileName
          visualSignatureApplied = true
        } else {
          outputBlob = row.file
          outputName = row.file.name
        }

        const outputBytes = new Uint8Array(await outputBlob.arrayBuffer())
        const outputSha256 = await sha256Hex(outputBytes)

        archiveEntries.push({
          name: sanitizeFileName(outputName),
          bytes: outputBytes,
          modifiedAt: new Date(row.file.lastModified || Date.now()),
        })

        records.push({
          fileName: row.file.name,
          family: row.family,
          outputName,
          originalSize: row.file.size,
          outputSize: outputBlob.size,
          originalSha256,
          outputSha256,
          visualSignatureApplied,
        })

        setProgress(Math.round(((index + 1) / files.length) * 80))
      }

      if (signatureImageFile) {
        archiveEntries.push({
          name: `signature-image-${sanitizeFileName(signatureImageFile.name)}`,
          bytes: await fileToBytes(signatureImageFile),
          modifiedAt: new Date(signatureImageFile.lastModified || Date.now()),
        })
      }

      const manifest = {
        signedAt: new Date().toISOString(),
        signer,
        note,
        files: records,
      }

      archiveEntries.push({
        name: "signature-manifest.json",
        bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      })

      const blob = createTarArchive(archiveEntries)
      const outputName = `signed-files-${Date.now()}.tar`
      setManifestRows(records)
      setResultBlob(blob)
      setResultFileName(outputName)
      setProgress(100)
      emitToolSuccess("universal-signature-editor")
    } catch (signError: any) {
      setError(signError?.message || (zh ? "签名处理失败" : "Signing failed"))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{zh ? "全格式编辑签名工具" : "Universal Signature Editor"}</CardTitle>
          <CardDescription>
            {zh
              ? "支持 Word / PDF / PPT / Excel / Pics / Video / Audio。图片会直接写入可视签名，其他格式生成带签名清单的签名包。"
              : "Supports Word / PDF / PPT / Excel / Pics / Video / Audio. Images get visual signatures directly, while other formats are exported in a signed package with integrity manifest."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{zh ? "选择待签名文件" : "Select Files to Sign"}</Label>
            <Input type="file" multiple onChange={onPickFiles} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{zh ? "签署人" : "Signer"}</Label>
              <Input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder={zh ? "例如：运营管理员" : "e.g. Ops Admin"} />
            </div>
            <div className="space-y-2">
              <Label>{zh ? "签名字样图片（可选）" : "Signature Image (Optional)"}</Label>
              <Input type="file" accept="image/*" onChange={onPickSignatureImage} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{zh ? "签名说明" : "Signature Note"}</Label>
            <Textarea
              value={signNote}
              onChange={(event) => setSignNote(event.target.value)}
              placeholder={zh ? "例如：内部版本确认，仅供营销团队使用" : "e.g. Internal approved copy for marketing team only"}
              rows={3}
            />
          </div>

          {working ? <Progress value={progress} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void runSign()} disabled={files.length === 0 || working}>
              {working ? (zh ? "签名处理中..." : "Signing...") : zh ? "开始签名处理" : "Start Signing"}
            </Button>
            <Button variant="outline" onClick={clearAll} disabled={files.length === 0 || working}>
              {zh ? "清空列表" : "Clear"}
            </Button>
            <MpDownloadButton
              blob={resultBlob}
              filename={resultFileName}
              variant="outline"
              disabled={!resultBlob}
            />
          </div>

          {Object.keys(grouped).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(grouped).map(([family, count]) => (
                <Badge key={family} variant="outline">
                  {family}: {count}
                </Badge>
              ))}
            </div>
          ) : null}
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

      {manifestRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{zh ? "签名结果摘要" : "Signing Summary"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {manifestRows.map((row) => (
              <div key={`${row.fileName}_${row.outputName}`} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{row.fileName}</div>
                <div className="text-muted-foreground">
                  {toHumanSize(row.originalSize)} {"→"} {toHumanSize(row.outputSize)} {"|"} {row.visualSignatureApplied ? (zh ? "可视签名" : "Visual signature") : (zh ? "清单签名" : "Manifest signature")}
                </div>
              </div>
            ))}
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
