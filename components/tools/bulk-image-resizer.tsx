"use client"

import { useState, useCallback, useRef } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, X, Download, ImageIcon, Settings, Maximize2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import pica, { Pica } from "pica"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  dimensions?: { width: number; height: number }
  status: "pending" | "processing" | "completed"
  outputUrl?: string
  outputSize?: number
  outputFormat?: string
  errorMessage?: string
}

const presetSizes = [
  { name: "Instagram Square", width: 1080, height: 1080 },
  { name: "Instagram Story", width: 1080, height: 1920 },
  { name: "Facebook Cover", width: 1200, height: 630 },
  { name: "Twitter Header", width: 1500, height: 500 },
  { name: "LinkedIn Banner", width: 1584, height: 396 },
  { name: "YouTube Thumbnail", width: 1280, height: 720 },
  { name: "Custom", width: 0, height: 0 },
]

export function BulkImageResizer() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [selectedPreset, setSelectedPreset] = useState("Custom")
  const [customWidth, setCustomWidth] = useState(800)
  const [customHeight, setCustomHeight] = useState(600)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [quality, setQuality] = useState([85])
  const [format, setFormat] = useState("original")
  const [isProcessing, setIsProcessing] = useState(false)
  const picaRef = useRef<Pica | null>(null)
  
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `tools.bulkImageResizer.${key}`)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      status: "pending" as const,
    }))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    multiple: true,
  })

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id)
      const toRemove = prev.find((img) => img.id === id)
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview)
        if (toRemove.outputUrl) {
          URL.revokeObjectURL(toRemove.outputUrl)
        }
      }
      return updated
    })
  }

  const loadImageElement = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

  const resolveOutputType = (file: File) => {
    if (format === "original") {
      if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") {
        return file.type
      }
      return "image/png"
    }
    if (format === "jpeg") return "image/jpeg"
    if (format === "png") return "image/png"
    if (format === "webp") return "image/webp"
    return "image/png"
  }

  const resolveOutputExtension = (outputType: string) => {
    if (outputType === "image/jpeg") return "jpg"
    if (outputType === "image/webp") return "webp"
    return "png"
  }

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
  }

  const processImages = async () => {
    if (images.length === 0) return

    setIsProcessing(true)

    setImages((prev) =>
      prev.map((img) => {
        if (img.outputUrl) {
          URL.revokeObjectURL(img.outputUrl)
        }
        return {
          ...img,
          status: "processing" as const,
          errorMessage: undefined,
          outputUrl: undefined,
          outputSize: undefined,
          outputFormat: undefined,
        }
      })
    )

    try {
      const picaInstance = picaRef.current ?? pica()
      picaRef.current = picaInstance
      const targetWidthValue = Math.max(1, targetWidth > 0 ? targetWidth : customWidth)
      const targetHeightValue = Math.max(1, targetHeight > 0 ? targetHeight : customHeight)
      let successCount = 0

      for (const image of images) {
        try {
          const sourceImage = await loadImageElement(image.preview)
          const originalWidth = sourceImage.naturalWidth || sourceImage.width
          const originalHeight = sourceImage.naturalHeight || sourceImage.height
          const outputType = resolveOutputType(image.file)
          const outputExtension = resolveOutputExtension(outputType)

          let renderWidth = targetWidthValue
          let renderHeight = targetHeightValue

          if (maintainAspectRatio) {
            const scale = Math.min(targetWidthValue / originalWidth, targetHeightValue / originalHeight)
            renderWidth = Math.max(1, Math.round(originalWidth * scale))
            renderHeight = Math.max(1, Math.round(originalHeight * scale))
          }

          const resizedCanvas = document.createElement("canvas")
          resizedCanvas.width = renderWidth
          resizedCanvas.height = renderHeight
          await picaInstance.resize(sourceImage, resizedCanvas)

          const finalCanvas = document.createElement("canvas")
          finalCanvas.width = targetWidthValue
          finalCanvas.height = targetHeightValue
          const ctx = finalCanvas.getContext("2d")
          if (!ctx) {
            throw new Error("Canvas rendering not available")
          }

          if (maintainAspectRatio) {
            if (outputType === "image/jpeg") {
              ctx.fillStyle = "#ffffff"
              ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)
            }
            const offsetX = Math.max(0, Math.round((targetWidthValue - renderWidth) / 2))
            const offsetY = Math.max(0, Math.round((targetHeightValue - renderHeight) / 2))
            ctx.drawImage(resizedCanvas, offsetX, offsetY)
          } else {
            ctx.drawImage(resizedCanvas, 0, 0, targetWidthValue, targetHeightValue)
          }

          const blob = await new Promise<Blob | null>((resolve) =>
            finalCanvas.toBlob(resolve, outputType, quality[0] / 100)
          )

          if (!blob) {
            throw new Error("Failed to export image")
          }

          const outputUrl = URL.createObjectURL(blob)
          setImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? {
                    ...img,
                    status: "completed" as const,
                    outputUrl,
                    outputSize: blob.size,
                    outputFormat: outputExtension.toUpperCase(),
                  }
                : img
            )
          )
          successCount += 1
        } catch (error) {
          console.error("Failed to process image:", error)
          setImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: "pending" as const, errorMessage: "Failed to process image" }
                : img
            )
          )
        }
      }

      if (successCount > 0) {
        emitToolSuccess("bulk-image-resizer")
      }
    } catch (error) {
      console.error("Processing failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadAll = () => {
    images
      .filter((image) => image.outputUrl)
      .forEach((image) => {
        const outputExtension = image.outputFormat?.toLowerCase() || "png"
        const outputName = `${image.name.replace(/\.[^/.]+$/, "")}-resized.${outputExtension}`
        triggerDownload(image.outputUrl as string, outputName)
      })
  }

  const downloadImage = (image: ImageFile) => {
    if (!image.outputUrl) return
    const outputExtension = image.outputFormat?.toLowerCase() || "png"
    const outputName = `${image.name.replace(/\.[^/.]+$/, "")}-resized.${outputExtension}`
    triggerDownload(image.outputUrl, outputName)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-muted-foreground"
      case "processing":
        return "text-[color:var(--file-converters)]"
      case "completed":
        return "text-green-500"
      default:
        return "text-muted-foreground"
    }
  }

  const selectedPresetData = presetSizes.find((p) => p.name === selectedPreset)
  const targetWidth = selectedPreset === "Custom" ? customWidth : selectedPresetData?.width || 0
  const targetHeight = selectedPreset === "Custom" ? customHeight : selectedPresetData?.height || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
            {tr("uploadTitle")}
          </CardTitle>
          <CardDescription>{tr("uploadDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-[color:var(--file-converters)] bg-[color:var(--file-converters)]/5"
                : "border-border hover:border-[color:var(--file-converters)]/50"
            }`}
          >
            <input {...getInputProps()} />
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-[color:var(--file-converters)]">{tr("dropActive")}</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">{tr("dropInactive")}</p>
                <p className="text-sm text-muted-foreground">{tr("supports")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resize Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[color:var(--file-converters)]" />
            {tr("settingsTitle")}
          </CardTitle>
          <CardDescription>{tr("settingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Sizes */}
          <div className="space-y-2">
            <Label>{tr("sizePreset")}</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetSizes.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name === "Custom" ? tr("custom") : preset.name} {preset.width > 0 && `(${preset.width} × ${preset.height})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Dimensions */}
          {selectedPreset === "Custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">{tr("width")}</Label>
                <Input
                  id="width"
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  min={1}
                  max={4000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">{tr("height")}</Label>
                <Input
                  id="height"
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  min={1}
                  max={4000}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="aspect-ratio" checked={maintainAspectRatio} onCheckedChange={setMaintainAspectRatio} />
              <Label htmlFor="aspect-ratio" className="text-sm">
                {tr("maintainAspectRatio")}
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>{tr("quality")}: {quality[0]}%</Label>
                <Slider value={quality} onValueChange={setQuality} max={100} min={10} step={5} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{tr("smallerFile")}</span>
                  <span>{tr("betterQuality")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tr("outputFormat")}</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">{tr("keepOriginal")}</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preview */}
          {targetWidth > 0 && targetHeight > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Maximize2 className="w-4 h-4 text-[color:var(--file-converters)]" />
                <span className="font-medium">{tr("targetSize")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {targetWidth} × {targetHeight} pixels
                {maintainAspectRatio && ` ${tr("aspectRatioMaintained")}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image List */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{tr("imagesToProcess")} ({images.length})</CardTitle>
                <CardDescription>{tr("reviewImages")}</CardDescription>
              </div>
              {images.some((img) => img.status === "completed") && (
                <Button onClick={downloadAll} variant="outline" className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  {tr("downloadAll")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {images.map((image) => (
                <div key={image.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{image.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(image.size)}
                      {image.outputSize && ` → ${formatFileSize(image.outputSize)}`}
                      {image.outputFormat && ` • ${image.outputFormat}`}
                    </p>
                    {image.errorMessage && <p className="text-sm text-red-500">{image.errorMessage}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(image.status)}`}>
                      {image.status === "pending" && tr("ready")}
                      {image.status === "processing" && tr("processing")}
                      {image.status === "completed" && tr("completed")}
                    </span>

                    {image.status === "completed" && image.outputUrl && (
                      <MpDownloadButton
                        blob={fetch(image.outputUrl).then(r => r.blob())}
                        filename={`${image.name.replace(/\.[^/.]+$/, "")}-resized.${image.outputFormat?.toLowerCase() || "png"}`}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      />
                    )}

                    {image.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(image.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      <div className="flex justify-center">
        <Button
          onClick={processImages}
          disabled={images.length === 0 || isProcessing}
          size="lg"
          className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {tr("processing")}
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              {tr("resizeAll")}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
