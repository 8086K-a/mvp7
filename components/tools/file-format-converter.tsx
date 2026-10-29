"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Download, FileText, ArrowRight } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { useI18n } from '@/lib/i18n/context'
import * as mammoth from "mammoth"
import * as XLSX from "xlsx"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface ConversionFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: "pending" | "converting" | "completed" | "error"
  outputUrl?: string
  outputName?: string
  outputSize?: number
  errorMessage?: string
}

const outputFormatsByType: Record<string, { value: string; label: string }[]> = {
  docx: [
    { value: "txt", label: "Plain Text (.txt)" },
    { value: "html", label: "HTML Document (.html)" },
  ],
  xlsx: [
    { value: "csv", label: "CSV Spreadsheet (.csv)" },
    { value: "json", label: "JSON Data (.json)" },
  ],
}

export function FileFormatConverter() {
  const { t } = useI18n()
  const [files, setFiles] = useState<ConversionFile[]>([])
  const [outputFormat, setOutputFormat] = useState("txt")
  const [isConverting, setIsConverting] = useState(false)
  const [conversionError, setConversionError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.name.split(".").pop()?.toLowerCase() || "",
      status: "pending" as const,
    }))
    setFiles((prev) => [...prev, ...newFiles])
    setConversionError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: true,
  })

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((file) => file.id === id)
      if (fileToRemove?.outputUrl) {
        URL.revokeObjectURL(fileToRemove.outputUrl)
      }
      return prev.filter((file) => file.id !== id)
    })
  }

  const activeType = useMemo(() => {
    const uniqueTypes = Array.from(new Set(files.map((file) => file.type)))
    if (uniqueTypes.length === 1) return uniqueTypes[0]
    if (uniqueTypes.length > 1) return "mixed"
    return null
  }, [files])

  const outputOptions = useMemo(() => {
    if (!activeType || activeType === "mixed") return []
    return outputFormatsByType[activeType] || []
  }, [activeType])

  useEffect(() => {
    if (outputOptions.length === 0) return
    const hasCurrentOption = outputOptions.some((option) => option.value === outputFormat)
    if (!hasCurrentOption) {
      setOutputFormat(outputOptions[0].value)
    }
  }, [outputOptions, outputFormat])

  const convertFiles = async () => {
    if (files.length === 0) return

    if (activeType === "mixed") {
      setConversionError("Please convert one file type at a time.")
      setFiles((prev) => prev.map((file) => ({ ...file, status: "error" as const, errorMessage: "Mixed file types" })))
      return
    }

    if (!activeType || !outputFormatsByType[activeType]) {
      setConversionError("Unsupported file type.")
      setFiles((prev) => prev.map((file) => ({ ...file, status: "error" as const, errorMessage: "Unsupported type" })))
      return
    }

    if (!outputFormatsByType[activeType].some((option) => option.value === outputFormat)) {
      setConversionError("Output format not available for selected files.")
      return
    }

    setIsConverting(true)
    setConversionError(null)
    let successCount = 0

    setFiles((prev) => prev.map((file) => ({ ...file, status: "converting" as const, errorMessage: undefined })))

    try {
      for (const file of files) {
        try {
          if (file.outputUrl) {
            URL.revokeObjectURL(file.outputUrl)
          }
          const arrayBuffer = await file.file.arrayBuffer()
          let blob: Blob
          let extension = outputFormat

          if (activeType === "docx") {
            if (outputFormat === "txt") {
              const { value } = await mammoth.extractRawText({ arrayBuffer })
              blob = new Blob([value], { type: "text/plain;charset=utf-8" })
            } else {
              const { value } = await mammoth.convertToHtml({ arrayBuffer })
              blob = new Blob([value], { type: "text/html;charset=utf-8" })
            }
          } else {
            const workbook = XLSX.read(arrayBuffer, { type: "array" })
            if (outputFormat === "csv") {
              const csvContent = workbook.SheetNames.map((name) => {
                const sheet = workbook.Sheets[name]
                return `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`
              }).join("\n\n")
              blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
            } else {
              const jsonData: Record<string, unknown> = {}
              workbook.SheetNames.forEach((name) => {
                const sheet = workbook.Sheets[name]
                jsonData[name] = XLSX.utils.sheet_to_json(sheet, { defval: "" })
              })
              blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json;charset=utf-8" })
            }
          }

          const outputName = `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`
          const outputUrl = URL.createObjectURL(blob)

          setFiles((prev) =>
            prev.map((item) =>
              item.id === file.id
                ? {
                    ...item,
                    status: "completed" as const,
                    outputUrl,
                    outputName,
                    outputSize: blob.size,
                  }
                : item
            )
          )
          successCount += 1
        } catch (error) {
          console.error("Conversion failed:", error)
          setFiles((prev) =>
            prev.map((item) =>
              item.id === file.id
                ? { ...item, status: "error" as const, errorMessage: "Conversion failed" }
                : item
            )
          )
        }
      }

      if (successCount > 0) {
        emitToolSuccess("file-format-converter")
      }
    } catch (error) {
      console.error("Conversion failed:", error)
      setFiles((prev) => prev.map((file) => ({ ...file, status: "error" as const })))
    } finally {
      setIsConverting(false)
    }
  }

  const downloadFile = (file: ConversionFile) => {
    if (!file.outputUrl || !file.outputName) return
    const link = document.createElement("a")
    link.href = file.outputUrl
    link.download = file.outputName
    link.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    return <FileText className="w-8 h-8 text-[color:var(--file-converters)]" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-muted-foreground"
      case "converting":
        return "text-[color:var(--file-converters)]"
      case "completed":
        return "text-green-500"
      case "error":
        return "text-red-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
              {t('fileFormatConverter.uploadDocuments')}
            </CardTitle>
            <CardDescription>{t('fileFormatConverter.uploadDescription')}</CardDescription>
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
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                  <p className="text-[color:var(--file-converters)]">{t('fileFormatConverter.dropActive')}</p>
              ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">{t('fileFormatConverter.dropDocuments')}</p>
                    <p className="text-sm text-muted-foreground">{t('fileFormatConverter.supportedFormats')}</p>
                  </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Output Format Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{t('fileFormatConverter.outputFormat')}</CardTitle>
            <CardDescription>{t('fileFormatConverter.chooseOutputFormat')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={outputFormat}
              onValueChange={setOutputFormat}
              disabled={outputOptions.length === 0}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {outputOptions.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeType === "mixed" && (
              <p className="mt-2 text-sm text-red-500">Please convert one file type at a time.</p>
            )}
            {conversionError && activeType !== "mixed" && (
              <p className="mt-2 text-sm text-red-500">{conversionError}</p>
            )}
          </CardContent>
        </Card>

        {/* File List */}
        {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('fileFormatConverter.filesToConvert')} ({files.length})</CardTitle>
                <CardDescription>{t('fileFormatConverter.reviewFiles')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">{getFileIcon(file.type)}</div>

                          <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)}
                              {file.outputSize && ` → ${formatFileSize(file.outputSize)}`}
                              {` • ${file.type.toUpperCase()}`}
                          </p>
                            {file.errorMessage && <p className="text-sm text-red-500">{file.errorMessage}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{outputFormat.toUpperCase()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                      {file.status === "pending" && t('fileFormatConverter.ready')}
                      {file.status === "converting" && t('fileFormatConverter.converting')}
                      {file.status === "completed" && t('fileFormatConverter.completed')}
                      {file.status === "error" && t('fileFormatConverter.error')}
                    </span>

                          {file.status === "completed" && (
                              <Button variant="outline" size="sm" onClick={() => downloadFile(file)} className="gap-1">
                                <Download className="w-3 h-3" />
                                {t('fileFormatConverter.download')}
                              </Button>
                          )}

                          {file.status === "pending" && (
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(file.id)}
                                  className="text-red-500 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                                {t('fileFormatConverter.remove')}
                              </Button>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        )}

        {/* Convert Button */}
        <div className="flex justify-center">
          <Button
              onClick={convertFiles}
              disabled={files.length === 0 || isConverting}
              size="lg"
              className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
          >
            {isConverting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('fileFormatConverter.convertingFiles')}
                </>
            ) : (
                <>
                  <Download className="w-4 h-4" />
                  {t('fileFormatConverter.convertAllFiles')}
                </>
            )}
          </Button>
        </div>
      </div>
  )
}
