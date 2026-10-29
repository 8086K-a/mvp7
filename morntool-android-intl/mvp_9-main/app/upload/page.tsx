"use client"

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Download, FileText, Zap, AlertTriangle, CheckCircle, X } from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"

const CHUNK_SIZE = 1024 * 1024 * 2 // 2MB chunks

export default function UploadPage() {
  const { language } = useLanguage()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [processingMethod, setProcessingMethod] = useState<'web' | 'client'>('web')
  const [uploadedChunks, setUploadedChunks] = useState<number>(0)
  const [totalChunks, setTotalChunks] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadProgress(0)
      setUploadedChunks(0)
      
      // 计算分块数量
      const chunks = Math.ceil(file.size / CHUNK_SIZE)
      setTotalChunks(chunks)
      
      // 根据文件大小自动选择处理方式
      if (file.size > 50 * 1024 * 1024) { // 50MB
        setProcessingMethod('client')
        toast({
          title: language === 'zh' ? '大文件检测' : 'Large File Detected',
          description: language === 'zh' 
            ? '检测到大文件，建议使用客户端处理以获得更好的性能' 
            : 'Large file detected, client-side processing recommended for better performance',
          variant: "default",
        })
      } else {
        setProcessingMethod('web')
      }
    }
  }

  const uploadChunk = async (chunk: Blob, chunkIndex: number, fileId: string) => {
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('fileId', fileId)
    formData.append('totalChunks', totalChunks.toString())

    try {
      const response = await fetch('/api/upload-chunk', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Chunk upload failed:', error)
      throw error
    }
  }

  const uploadFile = async () => {
    if (!selectedFile) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请选择文件' : 'Please select a file',
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 生成文件ID
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // 分块上传
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size)
        const chunk = selectedFile.slice(start, end)

        await uploadChunk(chunk, i, fileId)
        
        setUploadedChunks(i + 1)
        setUploadProgress(((i + 1) / totalChunks) * 100)
      }

      // 完成上传
      await fetch('/api/complete-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          processingMethod,
        }),
      })

      toast({
        title: language === 'zh' ? '上传成功' : 'Upload Successful',
        description: language === 'zh' 
          ? '文件上传完成，正在处理中...' 
          : 'File uploaded successfully, processing...',
        variant: "default",
      })

    } catch (error) {
      console.error('Upload failed:', error)
      toast({
        title: language === 'zh' ? '上传失败' : 'Upload Failed',
        description: language === 'zh' 
          ? '文件上传失败，请重试' 
          : 'File upload failed, please try again',
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadClientApp = () => {
    // 这里可以链接到客户端应用下载页面
    window.open('https://github.com/your-repo/securefiles-client', '_blank')
  }

  const getFileSizeInfo = () => {
    if (!selectedFile) return null

    const sizeInMB = selectedFile.size / 1024 / 1024
    const chunks = Math.ceil(selectedFile.size / CHUNK_SIZE)
    
    return {
      sizeInMB: sizeInMB.toFixed(2),
      chunks,
      estimatedTime: Math.ceil(sizeInMB / 10), // 假设10MB/分钟
    }
  }

  const fileInfo = getFileSizeInfo()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '大文件上传中心' : 'Large File Upload Center'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {language === 'zh' 
            ? '支持大文件上传，自动选择最佳处理方式' 
            : 'Support large file uploads with automatic processing method selection'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 文件上传 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {language === 'zh' ? '文件上传' : 'File Upload'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '选择要上传的文件' : 'Select file to upload'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="w-full"
                accept="*/*"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({fileInfo?.sizeInMB} MB)
                </div>
              )}
            </div>

            {/* 处理方式选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === 'zh' ? '处理方式' : 'Processing Method'}
              </label>
              <Select value={processingMethod} onValueChange={(value: 'web' | 'client') => setProcessingMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {language === 'zh' ? '网页处理 (推荐 <50MB)' : 'Web Processing (Recommended <50MB)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      {language === 'zh' ? '客户端处理 (推荐 >50MB)' : 'Client Processing (Recommended >50MB)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 文件信息 */}
            {fileInfo && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{language === 'zh' ? '文件信息' : 'File Information'}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '文件大小' : 'File Size'}</span>
                    <span>{fileInfo.sizeInMB} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '分块数量' : 'Chunks'}</span>
                    <span>{fileInfo.chunks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '预计时间' : 'Estimated Time'}</span>
                    <span>{fileInfo.estimatedTime} {language === 'zh' ? '分钟' : 'minutes'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 上传按钮 */}
            <Button 
              onClick={uploadFile} 
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'zh' ? '上传中...' : 'Uploading...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '开始上传' : 'Start Upload'}
                </>
              )}
            </Button>

            {/* 上传进度 */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{language === 'zh' ? '上传进度' : 'Upload Progress'}</span>
                  <span>{uploadedChunks}/{totalChunks} {language === 'zh' ? '块' : 'chunks'}</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 处理方式说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {language === 'zh' ? '处理方式说明' : 'Processing Methods'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '不同处理方式的优缺点' : 'Pros and cons of different processing methods'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 网页处理 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{language === 'zh' ? '网页处理' : 'Web Processing'}</h4>
                                 <Badge variant="default">推荐 &lt;50MB</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{language === 'zh' ? '无需安装，即开即用' : 'No installation required'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{language === 'zh' ? '跨平台兼容' : 'Cross-platform compatibility'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <span>{language === 'zh' ? '受浏览器内存限制' : 'Limited by browser memory'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <span>{language === 'zh' ? '大文件处理慢' : 'Slow for large files'}</span>
                </div>
              </div>
            </div>

            {/* 客户端处理 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{language === 'zh' ? '客户端处理' : 'Client Processing'}</h4>
                                 <Badge variant="destructive">推荐 &gt;50MB</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{language === 'zh' ? '无文件大小限制' : 'No file size limit'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{language === 'zh' ? '本地处理，速度快' : 'Local processing, fast'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{language === 'zh' ? '支持后台处理' : 'Background processing support'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <span>{language === 'zh' ? '需要安装应用' : 'Requires app installation'}</span>
                </div>
              </div>
            </div>

            {/* 下载客户端 */}
            {processingMethod === 'client' && (
              <Button 
                onClick={downloadClientApp}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {language === 'zh' ? '下载客户端应用' : 'Download Client App'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 使用建议 */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">{language === 'zh' ? '使用建议' : 'Usage Recommendations'}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">{language === 'zh' ? '✅ 网页处理适合' : '✅ Web Processing Suitable For'}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {language === 'zh' ? '文档文件 (<10MB)' : 'Document files (<10MB)'}</li>
                <li>• {language === 'zh' ? '图片文件 (<20MB)' : 'Image files (<20MB)'}</li>
                <li>• {language === 'zh' ? '小视频 (<50MB)' : 'Small videos (<50MB)'}</li>
                <li>• {language === 'zh' ? '快速处理需求' : 'Quick processing needs'}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">{language === 'zh' ? '⚠️ 客户端处理适合' : '⚠️ Client Processing Suitable For'}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {language === 'zh' ? '大视频文件 (>50MB)' : 'Large video files (>50MB)'}</li>
                <li>• {language === 'zh' ? '批量文件处理' : 'Batch file processing'}</li>
                <li>• {language === 'zh' ? '高安全性需求' : 'High security requirements'}</li>
                <li>• {language === 'zh' ? '离线处理需求' : 'Offline processing needs'}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">{language === 'zh' ? '💡 性能优化建议' : '💡 Performance Tips'}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {language === 'zh' ? '使用稳定的网络连接' : 'Use stable network connection'}</li>
                <li>• {language === 'zh' ? '避免同时上传多个大文件' : 'Avoid uploading multiple large files'}</li>
                <li>• {language === 'zh' ? '定期清理浏览器缓存' : 'Regularly clear browser cache'}</li>
                <li>• {language === 'zh' ? '考虑使用客户端应用' : 'Consider using client application'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}