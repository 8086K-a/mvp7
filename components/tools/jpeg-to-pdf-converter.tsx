"use client"

import { useState, useCallback } from "react"
import { useLanguage } from "@/components/language-provider"
import { interpolate, t } from "@/lib/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, X, Download, FileImage, FileText, Settings, Eye } from "lucide-react"
import { useDropzone } from "react-dropzone"
import jsPDF from "jspdf"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
}

type ConverterMode = "image-to-pdf" | "pdf-to-image"

interface PdfFile {
  file: File
  name: string
  size: number
}

interface PdfOutput {
  id: string
  pageNumber: number
  outputUrl: string
  outputName: string
  outputSize: number
}

export function JpegToPdfConverter() {
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `jpegToPdfTool.${key}`)
  const [mode, setMode] = useState<ConverterMode>("image-to-pdf")
  const [images, setImages] = useState<ImageFile[]>([])
  const [quality, setQuality] = useState([80])
  const [pageSize, setPageSize] = useState("A4")
  const [orientation, setOrientation] = useState("portrait")
  const [isConverting, setIsConverting] = useState(false)
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null)
  const [pdfOutputs, setPdfOutputs] = useState<PdfOutput[]>([])
  const [pdfOutputFormat, setPdfOutputFormat] = useState<"jpg" | "png">("jpg")
  const [pdfQuality, setPdfQuality] = useState([90])
  const [isPdfConverting, setIsPdfConverting] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: true,
  })

  const onDropPdf = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setPdfFile({ file, name: file.name, size: file.size })
    setPdfPageCount(null)
    setPdfError(null)
    setPdfOutputs((prev) => {
      prev.forEach((output) => URL.revokeObjectURL(output.outputUrl))
      return []
    })
  }, [])

  const {
    getRootProps: getPdfRootProps,
    getInputProps: getPdfInputProps,
    isDragActive: isPdfDragActive,
  } = useDropzone({
    onDrop: onDropPdf,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  })

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id)
      const toRemove = prev.find((img) => img.id === id)
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview)
      }
      return updated
    })
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }

  const clearPdfOutputs = () => {
    setPdfOutputs((prev) => {
      prev.forEach((output) => URL.revokeObjectURL(output.outputUrl))
      return []
    })
  }

  const removePdf = () => {
    setPdfFile(null)
    setPdfPageCount(null)
    setPdfError(null)
    clearPdfOutputs()
  }

  const downloadPdfOutput = (output: PdfOutput) => {
    const link = document.createElement("a")
    link.href = output.outputUrl
    link.download = output.outputName
    link.click()
  }

  const convertPdfToImages = async () => {
    if (!pdfFile) return

    setIsPdfConverting(true)
    setPdfError(null)
    clearPdfOutputs()

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
      // Use the matching CDN worker to avoid bundle-time worker path resolution issues.
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`

      const arrayBuffer = await pdfFile.file.arrayBuffer()
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
      const pdfDocument = await loadingTask.promise
      setPdfPageCount(pdfDocument.numPages)

      const outputType = pdfOutputFormat === "png" ? "image/png" : "image/jpeg"
      const outputExtension = pdfOutputFormat === "png" ? "png" : "jpg"
      const baseName = pdfFile.name.replace(/\.[^/.]+$/, "")
      let successCount = 0

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 2 })

        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        if (!context) {
          throw new Error("Canvas rendering not available")
        }
        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: context, viewport }).promise

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(
            resolve,
            outputType,
            outputType === "image/jpeg" ? pdfQuality[0] / 100 : undefined
          )
        )

        if (!blob) {
          throw new Error("Failed to export image")
        }

        const outputUrl = URL.createObjectURL(blob)
        setPdfOutputs((prev) => [
          ...prev,
          {
            id: `${pageNumber}-${Date.now()}`,
            pageNumber,
            outputUrl,
            outputName: `${baseName}-page-${pageNumber}.${outputExtension}`,
            outputSize: blob.size,
          },
        ])
        successCount += 1
      }

      if (successCount > 0) {
        emitToolSuccess("jpeg-to-pdf")
      }
    } catch (error) {
      console.error("PDF to image conversion failed:", error)
      setPdfError(tr("pdfToImageFailed"))
    } finally {
      setIsPdfConverting(false)
    }
  }

  const convertToPdf = async () => {
    if (images.length === 0) return

    setIsConverting(true)
    // In a real implementation, you would use a library like jsPDF or send to a backend
    try {
      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: orientation as 'p' | 'l',
        unit: 'mm',
        format: pageSize.toLowerCase()
      })

      // Process each image
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const imgElement = new Image()
        imgElement.src = URL.createObjectURL(img.file)

        // Wait for image to load
        await new Promise((resolve, reject) => {
          imgElement.onload = () => {
            // Add new page for each image except the first one
            if (i > 0) {
              pdf.addPage()
            }

            // Calculate dimensions to fit the page while maintaining aspect ratio
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()

            const imgWidth = imgElement.width
            const imgHeight = imgElement.height

            // Calculate scale to fit image within page dimensions with some margins
            const margin = 10
            const maxWidth = pageWidth - (margin * 2)
            const maxHeight = pageHeight - (margin * 2)

            let scaledWidth = imgWidth
            let scaledHeight = imgHeight

            // Scale down if needed to fit the page
            if (scaledWidth > maxWidth) {
              const ratio = maxWidth / scaledWidth
              scaledWidth = maxWidth
              scaledHeight = imgHeight * ratio
            }

            if (scaledHeight > maxHeight) {
              const ratio = maxHeight / scaledHeight
              scaledHeight = maxHeight
              scaledWidth = imgWidth * ratio
            }

            // Calculate position to center the image on the page
            const x = (pageWidth - scaledWidth) / 2
            const y = (pageHeight - scaledHeight) / 2

            // Determine image format based on file extension
            let format = 'JPEG';
            if (img.name.toLowerCase().endsWith('.png')) {
              format = 'PNG';
            } else if (img.name.toLowerCase().endsWith('.webp')) {
              format = 'JPEG'; // jsPDF doesn't support webp, so convert to jpeg
            }

            // Add the image to the PDF
            pdf.addImage(
                imgElement,
                format,
                x,
                y,
                scaledWidth,
                scaledHeight
            )

            resolve(null)
          }

          imgElement.onerror = (error) => {
            console.error("Error loading image:", error)
            reject(error)
          }
        })
      }

      // Save the PDF
      const pdfBlob = pdf.output('blob')
      setPdfBlob(pdfBlob)
      emitToolSuccess("jpeg-to-pdf")
    } catch (error) {
      console.error("Conversion failed:", error)
      alert(tr("conversionFailed"))
    } finally {
      setIsConverting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs value={mode} onValueChange={(value) => setMode(value as ConverterMode)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="image-to-pdf">{tr("imageToPdf")}</TabsTrigger>
          <TabsTrigger value="pdf-to-image">{tr("pdfToImage")}</TabsTrigger>
        </TabsList>

        <TabsContent value="image-to-pdf">
          <div className="space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
                  {tr("uploadImages")}
                </CardTitle>
                <CardDescription>{tr("dragDropDescription")}</CardDescription>
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
                  <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-[color:var(--file-converters)]">{tr("dropImagesHere")}</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">{tr("dropOrClick")}</p>
                      <p className="text-sm text-muted-foreground">{tr("supportsFormats")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Image Preview */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[color:var(--file-converters)]" />
                    {tr("imagePreview")} ({images.length} {tr("imagesCount")})
                  </CardTitle>
                  <CardDescription>{tr("dragToReorder")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                          <img
                            src={image.preview || "/placeholder.svg"}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <div className="mt-2">
                          <p className="text-xs font-medium truncate">{image.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(image.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[color:var(--file-converters)]" />
                  {tr("pdfSettings")}
                </CardTitle>
                <CardDescription>{tr("configureOutput")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="page-size">{tr("pageSize")}</Label>
                    <Select value={pageSize} onValueChange={setPageSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                        <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                        <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orientation">{tr("orientation")}</Label>
                    <Select value={orientation} onValueChange={setOrientation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">{tr("portrait")}</SelectItem>
                        <SelectItem value="landscape">{tr("landscape")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>
                    {tr("imageQuality")}: {quality[0]}%
                  </Label>
                  <Slider value={quality} onValueChange={setQuality} max={100} min={10} step={5} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{tr("lowerQuality")}</span>
                    <span>{tr("higherQuality")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Convert Button */}
            <div className="flex justify-center gap-3">
              <Button
                onClick={convertToPdf}
                disabled={images.length === 0 || isConverting}
                size="lg"
                className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
              >
                {isConverting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {tr("converting")}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {tr("convertToPdf")}
                  </>
                )}
              </Button>
              {pdfBlob && (
                <MpDownloadButton
                  blob={pdfBlob}
                  filename="converted-images.pdf"
                  size="lg"
                  variant="outline"
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pdf-to-image">
          <div className="space-y-6">
            {/* Upload PDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
                  {tr("uploadPdf")}
                </CardTitle>
                <CardDescription>{tr("dragDropPdfDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getPdfRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isPdfDragActive
                      ? "border-[color:var(--file-converters)] bg-[color:var(--file-converters)]/5"
                      : "border-border hover:border-[color:var(--file-converters)]/50"
                  }`}
                >
                  <input {...getPdfInputProps()} />
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {isPdfDragActive ? (
                    <p className="text-[color:var(--file-converters)]">{tr("dropPdfHere")}</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">{tr("dropPdfOrClick")}</p>
                      <p className="text-sm text-muted-foreground">{tr("supportsPdf")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {pdfFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[color:var(--file-converters)]" />
                    {tr("pdfFile")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{pdfFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(pdfFile.size)}
                        {pdfPageCount ? ` • ${pdfPageCount} ${tr("pages")}` : ""}
                      </p>
                      {pdfError && <p className="text-sm text-red-500">{pdfError}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={removePdf}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Image Output Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[color:var(--file-converters)]" />
                  {tr("imageSettings")}
                </CardTitle>
                <CardDescription>{tr("configureImageOutput")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="image-format">{tr("imageFormat")}</Label>
                  <Select value={pdfOutputFormat} onValueChange={(value) => setPdfOutputFormat(value as "jpg" | "png")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>
                    {tr("imageQuality")}: {pdfQuality[0]}%
                  </Label>
                  <Slider
                    value={pdfQuality}
                    onValueChange={setPdfQuality}
                    max={100}
                    min={10}
                    step={5}
                    className="w-full"
                    disabled={pdfOutputFormat === "png"}
                  />
                  <div
                    className={`flex justify-between text-xs text-muted-foreground ${
                      pdfOutputFormat === "png" ? "opacity-50" : ""
                    }`}
                  >
                    <span>{tr("lowerQuality")}</span>
                    <span>{tr("higherQuality")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {pdfOutputs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-[color:var(--file-converters)]" />
                    {tr("outputImages")} ({pdfOutputs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {pdfOutputs.map((output) => (
                      <div key={output.id} className="border rounded-lg p-3">
                        <div className="aspect-[3/4] bg-muted rounded-md overflow-hidden">
                          <img src={output.outputUrl} alt={output.outputName} className="w-full h-full object-cover" />
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium truncate">
                            {interpolate(tr("pageLabel"), { page: output.pageNumber })}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(output.outputSize)}</p>
                        </div>
                        <MpDownloadButton
                          blob={fetch(output.outputUrl).then(r => r.blob())}
                          filename={output.outputName}
                          size="sm"
                          className="mt-2 w-full"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Convert Button */}
            <div className="flex justify-center">
              <Button
                onClick={convertPdfToImages}
                disabled={!pdfFile || isPdfConverting}
                size="lg"
                className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
              >
                {isPdfConverting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {tr("convertingImages")}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {tr("convertToImages")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
