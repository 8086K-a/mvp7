"use client"

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { 
  FileText, 
  Download, 
  Upload, 
  Zap, 
  BarChart3, 
  RotateCcw, 
  Lock, 
  Crown,
  Info,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive
} from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"
import UpgradeModal from "@/components/upgrade-modal"

export default function CompressPage() {
  const { language } = useLanguage()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [compressionAlgorithm, setCompressionAlgorithm] = useState('gzip')
  const [compressionLevel, setCompressionLevel] = useState([6])
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressedFile, setCompressedFile] = useState<Blob | null>(null)
  const [compressionInfo, setCompressionInfo] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  const [userType, setUserType] = useState<'free' | 'premium'>('free')
  const [fileSize, setFileSize] = useState(0)
  const [isOptimized, setIsOptimized] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 免费用户限制
  const freeUserLimits = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxCompressionLevel: 6,
    allowedAlgorithms: ['gzip', 'brotli', 'zip', 'png', 'jpeg', 'mp3', 'mp4'],
    dailyCompressions: 10
  }

  // 高级用户限制
  const premiumUserLimits = {
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxCompressionLevel: 9,
    allowedAlgorithms: 'all',
    dailyCompressions: 1000
  }

  const algorithms = [
    { value: 'auto', label: language === 'zh' ? '自动检测 (推荐)' : 'Auto Detect (Recommended)', description: '智能选择最佳算法', premium: false },
    
    // 现代压缩格式
    { value: 'gzip', label: 'Gzip', description: 'GNU压缩格式，广泛支持', premium: false },
    { value: 'brotli', label: 'Brotli', description: 'Google开发的Web优化压缩', premium: false },
    { value: 'lzma', label: 'LZMA', description: '7-Zip使用的高压缩比格式', premium: true },
    { value: 'zstandard', label: 'Zstandard', description: 'Facebook开发的现代平衡压缩', premium: true },
    { value: 'lz4', label: 'LZ4', description: '极速压缩格式，适合实时应用', premium: true },
    { value: 'bzip2', label: 'Bzip2', description: 'Burrows-Wheeler变换压缩', premium: true },
    { value: 'xz', label: 'XZ', description: 'LZMA2压缩格式，高压缩比', premium: true },
    { value: 'lzop', label: 'LZOP', description: '快速压缩格式', premium: true },
    { value: 'zpaq', label: 'ZPAQ', description: '增量压缩格式', premium: true },
    { value: 'lrzip', label: 'LRZIP', description: '长期压缩格式', premium: true },
    { value: 'plzip', label: 'PLZIP', description: '并行LZMA压缩', premium: true },
    { value: 'pigz', label: 'Pigz', description: '并行Gzip压缩', premium: true },
    { value: 'pbzip2', label: 'PBzip2', description: '并行Bzip2压缩', premium: true },
    
    // 图片压缩格式
    { value: 'jpeg', label: 'JPEG', description: '联合图像专家组压缩', premium: false },
    { value: 'png', label: 'PNG', description: '便携式网络图形压缩', premium: false },
    { value: 'webp', label: 'WebP', description: 'Google开发的Web图片格式', premium: true },
    { value: 'avif', label: 'AVIF', description: 'AV1图像文件格式', premium: true },
    { value: 'heic', label: 'HEIC', description: '高效图像容器格式', premium: true },
    { value: 'bmp', label: 'BMP', description: '位图图像格式', premium: false },
    { value: 'tiff', label: 'TIFF', description: '标签图像文件格式', premium: true },
    { value: 'gif', label: 'GIF', description: '图形交换格式', premium: false },
    { value: 'svg', label: 'SVG', description: '可缩放矢量图形', premium: true },
    { value: 'ico', label: 'ICO', description: 'Windows图标格式', premium: false },
    { value: 'raw', label: 'RAW', description: '原始图像数据格式', premium: true },
    { value: 'psd', label: 'PSD', description: 'Photoshop文档格式', premium: true },
    { value: 'ai', label: 'AI', description: 'Adobe Illustrator格式', premium: true },
    { value: 'eps', label: 'EPS', description: '封装PostScript格式', premium: true },
    { value: 'pdf', label: 'PDF', description: '便携式文档格式', premium: true },
    
    // 音频压缩格式
    { value: 'mp3', label: 'MP3', description: 'MPEG音频层III压缩', premium: false },
    { value: 'aac', label: 'AAC', description: '高级音频编码', premium: true },
    { value: 'ogg', label: 'OGG', description: 'Ogg Vorbis音频格式', premium: true },
    { value: 'flac', label: 'FLAC', description: '无损音频压缩', premium: true },
    { value: 'wav', label: 'WAV', description: '波形音频文件格式', premium: false },
    { value: 'wma', label: 'WMA', description: 'Windows媒体音频', premium: true },
    { value: 'opus', label: 'Opus', description: '现代音频压缩格式', premium: true },
    { value: 'alac', label: 'ALAC', description: 'Apple无损音频编码', premium: true },
    { value: 'ape', label: 'APE', description: 'Monkey\'s Audio无损压缩', premium: true },
    { value: 'm4a', label: 'M4A', description: 'MPEG-4音频格式', premium: true },
    { value: 'aiff', label: 'AIFF', description: '音频交换文件格式', premium: true },
    { value: 'au', label: 'AU', description: 'Sun音频格式', premium: true },
    { value: 'midi', label: 'MIDI', description: '乐器数字接口格式', premium: false },
    
    // 视频压缩格式
    { value: 'mp4', label: 'MP4', description: 'MPEG-4视频格式', premium: false },
    { value: 'avi', label: 'AVI', description: '音频视频交错格式', premium: false },
    { value: 'mkv', label: 'MKV', description: 'Matroska视频格式', premium: true },
    { value: 'mov', label: 'MOV', description: 'QuickTime电影格式', premium: true },
    { value: 'wmv', label: 'WMV', description: 'Windows媒体视频', premium: true },
    { value: 'flv', label: 'FLV', description: 'Flash视频格式', premium: true },
    { value: 'webm', label: 'WebM', description: 'Web视频格式', premium: true },
    { value: 'm4v', label: 'M4V', description: 'iTunes视频格式', premium: true },
    { value: '3gp', label: '3GP', description: '3GPP多媒体格式', premium: true },
    { value: 'ogv', label: 'OGV', description: 'Ogg视频格式', premium: true },
    { value: 'ts', label: 'TS', description: 'MPEG传输流格式', premium: true },
    { value: 'mts', label: 'MTS', description: 'AVCHD视频格式', premium: true },
    { value: 'rmvb', label: 'RMVB', description: 'RealMedia可变比特率', premium: true },
    { value: 'divx', label: 'DIVX', description: 'DivX视频格式', premium: true },
    { value: 'xvid', label: 'XVID', description: 'XviD视频编码', premium: true },
    { value: 'h264', label: 'H.264', description: '高级视频编码', premium: true },
    { value: 'h265', label: 'H.265', description: '高效视频编码', premium: true },
    { value: 'vp8', label: 'VP8', description: 'Google视频编码', premium: true },
    { value: 'vp9', label: 'VP9', description: 'Google下一代视频编码', premium: true },
    { value: 'av1', label: 'AV1', description: '开放媒体联盟视频编码', premium: true },
    
    // 归档格式
    { value: 'zip', label: 'ZIP', description: '通用压缩归档格式', premium: false },
    { value: 'rar', label: 'RAR', description: 'WinRAR压缩格式', premium: true },
    { value: '7z', label: '7-Zip', description: '7-Zip高压缩比格式', premium: true },
    { value: 'tar', label: 'TAR', description: '磁带归档格式', premium: false },
    { value: 'cab', label: 'CAB', description: 'Windows压缩格式', premium: true },
    { value: 'ar', label: 'AR', description: 'Unix归档格式', premium: true },
    { value: 'cpio', label: 'CPIO', description: 'Unix复制输入输出格式', premium: true },
    { value: 'iso', label: 'ISO', description: '光盘镜像格式', premium: true },
    { value: 'deb', label: 'DEB', description: 'Debian软件包格式', premium: true },
    { value: 'rpm', label: 'RPM', description: 'Red Hat软件包格式', premium: true },
    { value: 'pkg', label: 'PKG', description: 'macOS软件包格式', premium: true },
    { value: 'msi', label: 'MSI', description: 'Windows安装包格式', premium: true },
    
    // 专业格式
    { value: 'ace', label: 'ACE', description: 'WinACE压缩格式', premium: true },
    { value: 'arc', label: 'ARC', description: 'ARC压缩格式', premium: true },
    { value: 'arj', label: 'ARJ', description: 'ARJ压缩格式', premium: true },
    { value: 'lha', label: 'LHA', description: 'LHA压缩格式', premium: true },
    { value: 'lzh', label: 'LZH', description: 'LZH压缩格式', premium: true },
    { value: 'pak', label: 'PAK', description: 'PAK压缩格式', premium: true },
    { value: 'zoo', label: 'ZOO', description: 'ZOO压缩格式', premium: true },
    { value: 'dmg', label: 'DMG', description: 'macOS磁盘镜像', premium: true },
    { value: 'pax', label: 'PAX', description: 'POSIX归档格式', premium: true },
    { value: 'shar', label: 'SHAR', description: 'Shell归档格式', premium: true },
    { value: 'ustar', label: 'USTAR', description: 'Unix标准归档格式', premium: true }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 检查文件大小限制
      const limits = userType === 'free' ? freeUserLimits : premiumUserLimits
      if (file.size > limits.maxFileSize) {
        setUpgradeReason(language === 'zh' 
          ? `您的文件大小为${(file.size / 1024 / 1024).toFixed(1)}MB，超过了免费版${(limits.maxFileSize / 1024 / 1024).toFixed(0)}MB的限制`
          : `Your file size is ${(file.size / 1024 / 1024).toFixed(1)}MB, which exceeds the free plan limit of ${(limits.maxFileSize / 1024 / 1024).toFixed(0)}MB`
        )
        setShowUpgradeModal(true)
        return
      }

      setSelectedFile(file)
      setFileSize(file.size)
      setCompressedFile(null)
      setCompressionInfo(null)
      setProgress(0)
      
      // 自动检测文件格式
      detectFileFormat(file)
    }
  }

  const detectFileFormat = (file: File) => {
    const fileName = file.name.toLowerCase()
    let detectedFormat = 'auto'
    
    // 现代压缩格式
    if (fileName.endsWith('.gz') || fileName.endsWith('.gzip')) {
      detectedFormat = 'gzip'
    } else if (fileName.endsWith('.br')) {
      detectedFormat = 'brotli'
    } else if (fileName.endsWith('.lzma')) {
      detectedFormat = 'lzma'
    } else if (fileName.endsWith('.xz')) {
      detectedFormat = 'xz'
    } else if (fileName.endsWith('.zst') || fileName.endsWith('.zstd')) {
      detectedFormat = 'zstandard'
    } else if (fileName.endsWith('.lz4')) {
      detectedFormat = 'lz4'
    } else if (fileName.endsWith('.bz2') || fileName.endsWith('.bzip2')) {
      detectedFormat = 'bzip2'
    } else if (fileName.endsWith('.lzo') || fileName.endsWith('.lzop')) {
      detectedFormat = 'lzop'
    } else if (fileName.endsWith('.zpaq')) {
      detectedFormat = 'zpaq'
    } else if (fileName.endsWith('.lrz')) {
      detectedFormat = 'lrzip'
    } else if (fileName.endsWith('.plz')) {
      detectedFormat = 'plzip'
    } else if (fileName.endsWith('.pigz')) {
      detectedFormat = 'pigz'
    } else if (fileName.endsWith('.pbz2')) {
      detectedFormat = 'pbzip2'
    }
    // 图片格式
    else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      detectedFormat = 'jpeg'
    } else if (fileName.endsWith('.png')) {
      detectedFormat = 'png'
    } else if (fileName.endsWith('.webp')) {
      detectedFormat = 'webp'
    } else if (fileName.endsWith('.avif')) {
      detectedFormat = 'avif'
    } else if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      detectedFormat = 'heic'
    } else if (fileName.endsWith('.bmp')) {
      detectedFormat = 'bmp'
    } else if (fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
      detectedFormat = 'tiff'
    } else if (fileName.endsWith('.gif')) {
      detectedFormat = 'gif'
    } else if (fileName.endsWith('.svg')) {
      detectedFormat = 'svg'
    } else if (fileName.endsWith('.ico')) {
      detectedFormat = 'ico'
    } else if (fileName.endsWith('.raw') || fileName.endsWith('.cr2') || fileName.endsWith('.nef') || fileName.endsWith('.arw')) {
      detectedFormat = 'raw'
    } else if (fileName.endsWith('.psd')) {
      detectedFormat = 'psd'
    } else if (fileName.endsWith('.ai')) {
      detectedFormat = 'ai'
    } else if (fileName.endsWith('.eps')) {
      detectedFormat = 'eps'
    } else if (fileName.endsWith('.pdf')) {
      detectedFormat = 'pdf'
    }
    // 音频格式
    else if (fileName.endsWith('.mp3')) {
      detectedFormat = 'mp3'
    } else if (fileName.endsWith('.aac')) {
      detectedFormat = 'aac'
    } else if (fileName.endsWith('.ogg')) {
      detectedFormat = 'ogg'
    } else if (fileName.endsWith('.flac')) {
      detectedFormat = 'flac'
    } else if (fileName.endsWith('.wav')) {
      detectedFormat = 'wav'
    } else if (fileName.endsWith('.wma')) {
      detectedFormat = 'wma'
    } else if (fileName.endsWith('.opus')) {
      detectedFormat = 'opus'
    } else if (fileName.endsWith('.m4a')) {
      detectedFormat = 'm4a'
    } else if (fileName.endsWith('.aiff') || fileName.endsWith('.aif')) {
      detectedFormat = 'aiff'
    } else if (fileName.endsWith('.au')) {
      detectedFormat = 'au'
    } else if (fileName.endsWith('.mid') || fileName.endsWith('.midi')) {
      detectedFormat = 'midi'
    }
    // 视频格式
    else if (fileName.endsWith('.mp4')) {
      detectedFormat = 'mp4'
    } else if (fileName.endsWith('.avi')) {
      detectedFormat = 'avi'
    } else if (fileName.endsWith('.mkv')) {
      detectedFormat = 'mkv'
    } else if (fileName.endsWith('.mov')) {
      detectedFormat = 'mov'
    } else if (fileName.endsWith('.wmv')) {
      detectedFormat = 'wmv'
    } else if (fileName.endsWith('.flv')) {
      detectedFormat = 'flv'
    } else if (fileName.endsWith('.webm')) {
      detectedFormat = 'webm'
    } else if (fileName.endsWith('.m4v')) {
      detectedFormat = 'm4v'
    } else if (fileName.endsWith('.3gp')) {
      detectedFormat = '3gp'
    } else if (fileName.endsWith('.ogv')) {
      detectedFormat = 'ogv'
    } else if (fileName.endsWith('.ts')) {
      detectedFormat = 'ts'
    } else if (fileName.endsWith('.mts')) {
      detectedFormat = 'mts'
    } else if (fileName.endsWith('.rmvb')) {
      detectedFormat = 'rmvb'
    } else if (fileName.endsWith('.divx')) {
      detectedFormat = 'divx'
    } else if (fileName.endsWith('.xvid')) {
      detectedFormat = 'xvid'
    }
    // 归档格式
    else if (fileName.endsWith('.zip')) {
      detectedFormat = 'zip'
    } else if (fileName.endsWith('.rar')) {
      detectedFormat = 'rar'
    } else if (fileName.endsWith('.7z')) {
      detectedFormat = '7z'
    } else if (fileName.endsWith('.tar')) {
      detectedFormat = 'tar'
    } else if (fileName.endsWith('.cab')) {
      detectedFormat = 'cab'
    } else if (fileName.endsWith('.ar')) {
      detectedFormat = 'ar'
    } else if (fileName.endsWith('.cpio')) {
      detectedFormat = 'cpio'
    } else if (fileName.endsWith('.iso')) {
      detectedFormat = 'iso'
    } else if (fileName.endsWith('.deb')) {
      detectedFormat = 'deb'
    } else if (fileName.endsWith('.rpm')) {
      detectedFormat = 'rpm'
    } else if (fileName.endsWith('.pkg')) {
      detectedFormat = 'pkg'
    } else if (fileName.endsWith('.msi')) {
      detectedFormat = 'msi'
    }
    // 专业格式
    else if (fileName.endsWith('.ace')) {
      detectedFormat = 'ace'
    } else if (fileName.endsWith('.arc')) {
      detectedFormat = 'arc'
    } else if (fileName.endsWith('.arj')) {
      detectedFormat = 'arj'
    } else if (fileName.endsWith('.lha') || fileName.endsWith('.lzh')) {
      detectedFormat = 'lha'
    } else if (fileName.endsWith('.pak')) {
      detectedFormat = 'pak'
    } else if (fileName.endsWith('.zoo')) {
      detectedFormat = 'zoo'
    } else if (fileName.endsWith('.dmg')) {
      detectedFormat = 'dmg'
    } else if (fileName.endsWith('.pax')) {
      detectedFormat = 'pax'
    } else if (fileName.endsWith('.shar')) {
      detectedFormat = 'shar'
    } else if (fileName.endsWith('.ustar')) {
      detectedFormat = 'ustar'
    }
    
    setCompressionAlgorithm(detectedFormat)
  }

  const checkAlgorithmAccess = (algorithm: string) => {
    if (userType === 'premium') return true
    const limits = freeUserLimits
    return limits.allowedAlgorithms.includes(algorithm)
  }

  const startCompression = async () => {
    if (!selectedFile) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请选择要压缩的文件' : 'Please select a file to compress',
        variant: "destructive",
      })
      return
    }

    // 检查算法访问权限
    if (!checkAlgorithmAccess(compressionAlgorithm)) {
      setUpgradeReason(language === 'zh' 
        ? `您选择的${compressionAlgorithm.toUpperCase()}算法需要高级版才能使用`
        : `The ${compressionAlgorithm.toUpperCase()} algorithm you selected requires premium access`
      )
      setShowUpgradeModal(true)
      return
    }

    // 检查压缩级别限制
    const limits = userType === 'free' ? freeUserLimits : premiumUserLimits
    if (compressionLevel[0] > limits.maxCompressionLevel) {
      setUpgradeReason(language === 'zh' 
        ? `您设置的压缩级别${compressionLevel[0]}超过了免费版最大级别${limits.maxCompressionLevel}的限制`
        : `Your compression level ${compressionLevel[0]} exceeds the free plan maximum level of ${limits.maxCompressionLevel}`
      )
      setShowUpgradeModal(true)
      return
    }

    setIsCompressing(true)
    setProgress(0)

    try {
      // 模拟压缩过程
      const steps = [
        { progress: 10, message: language === 'zh' ? '分析文件格式...' : 'Analyzing file format...' },
        { progress: 25, message: language === 'zh' ? '准备压缩算法...' : 'Preparing compression algorithm...' },
        { progress: 40, message: language === 'zh' ? '压缩数据...' : 'Compressing data...' },
        { progress: 70, message: language === 'zh' ? '优化压缩结果...' : 'Optimizing compression result...' },
        { progress: 90, message: language === 'zh' ? '生成压缩文件...' : 'Generating compressed file...' },
        { progress: 100, message: language === 'zh' ? '压缩完成' : 'Compression complete' }
      ]

      for (const step of steps) {
        setProgress(step.progress)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // 模拟压缩结果
      const compressionRatio = (2 + Math.random() * 8).toFixed(2) // 2-10倍压缩比
      const compressedSize = Math.floor(fileSize / parseFloat(compressionRatio))
      const compressedBlob = new Blob([selectedFile], { type: 'application/octet-stream' })
      
      setCompressedFile(compressedBlob)
      
      setCompressionInfo({
        originalSize: fileSize,
        compressedSize: compressedSize,
        compressionRatio: compressionRatio,
        algorithm: compressionAlgorithm,
        level: compressionLevel[0],
        timeSpent: Math.floor(Math.random() * 30) + 5, // 5-35秒
        spaceSaved: ((fileSize - compressedSize) / fileSize * 100).toFixed(1)
      })
      
      toast({
        title: language === 'zh' ? '压缩成功' : 'Compression Successful',
        description: language === 'zh' 
          ? `文件已成功压缩，压缩比 ${compressionRatio}:1，节省空间 ${((fileSize - compressedSize) / fileSize * 100).toFixed(1)}%`
          : `File has been compressed successfully, ratio ${compressionRatio}:1, saved ${((fileSize - compressedSize) / fileSize * 100).toFixed(1)}% space`,
      })
    } catch (error) {
      toast({
        title: language === 'zh' ? '压缩失败' : 'Compression Failed',
        description: language === 'zh' ? '压缩过程中出现错误' : 'An error occurred during compression',
        variant: "destructive",
      })
    } finally {
      setIsCompressing(false)
    }
  }

  const downloadCompressedFile = () => {
    if (compressedFile) {
      const url = URL.createObjectURL(compressedFile)
      const a = document.createElement('a')
      a.href = url
      a.download = selectedFile?.name.replace(/\.[^/.]+$/, '') + '.compressed'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setCompressedFile(null)
    setCompressionInfo(null)
    setProgress(0)
    setFileSize(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '文件压缩工具' : 'File Compression Tool'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {language === 'zh' 
            ? '支持多种格式的智能压缩，自动选择最佳算法' 
            : 'Smart compression supporting multiple formats with automatic algorithm selection'}
        </p>
      </div>

      {/* User Type Toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
          <button
            onClick={() => setUserType('free')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              userType === 'free' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {language === 'zh' ? '免费版' : 'Free'}
            </div>
          </button>
          <button
            onClick={() => setUserType('premium')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              userType === 'premium' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              {language === 'zh' ? '高级版' : 'Premium'}
            </div>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Compression Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {language === 'zh' ? '压缩设置' : 'Compression Settings'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '选择文件和配置压缩参数' : 'Select file and configure compression parameters'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="file">
                {language === 'zh' ? '选择要压缩的文件' : 'Select File to Compress'}
              </Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".gz,.gzip,.br,.lzma,.xz,.zst,.zstd,.lz4,.bz2,.bzip2,.lzo,.lzop,.zpaq,.lrz,.plz,.pigz,.pbz2,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.bmp,.tiff,.tif,.gif,.svg,.ico,.raw,.cr2,.nef,.arw,.psd,.ai,.eps,.pdf,.mp3,.aac,.ogg,.flac,.wav,.wma,.opus,.m4a,.aiff,.aif,.au,.mid,.midi,.mp4,.avi,.mkv,.mov,.wmv,.flv,.webm,.m4v,.3gp,.ogv,.ts,.mts,.rmvb,.divx,.xvid,.zip,.rar,.7z,.tar,.cab,.ar,.cpio,.iso,.deb,.rpm,.pkg,.msi,.ace,.arc,.arj,.lha,.lzh,.pak,.zoo,.dmg,.pax,.shar,.ustar"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              
              {/* File Size Limit Warning */}
              {selectedFile && (
                <div className={`flex items-center gap-2 text-sm ${
                  selectedFile.size > (userType === 'free' ? freeUserLimits.maxFileSize : premiumUserLimits.maxFileSize)
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {selectedFile.size > (userType === 'free' ? freeUserLimits.maxFileSize : premiumUserLimits.maxFileSize) ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {language === 'zh' 
                    ? `文件大小限制: ${((userType === 'free' ? freeUserLimits.maxFileSize : premiumUserLimits.maxFileSize) / 1024 / 1024).toFixed(0)}MB`
                    : `File size limit: ${((userType === 'free' ? freeUserLimits.maxFileSize : premiumUserLimits.maxFileSize) / 1024 / 1024).toFixed(0)}MB`
                  }
                </div>
              )}
            </div>

            {/* Algorithm Selection */}
            <div className="space-y-2">
              <Label htmlFor="algorithm">
                {language === 'zh' ? '压缩算法' : 'Compression Algorithm'}
              </Label>
              <Select value={compressionAlgorithm} onValueChange={setCompressionAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((algo) => {
                    const isAllowed = userType === 'premium' || !algo.premium
                    return (
                      <SelectItem 
                        key={algo.value} 
                        value={algo.value}
                        disabled={!isAllowed}
                        onSelect={() => {
                          if (!isAllowed) {
                            setUpgradeReason(language === 'zh' 
                              ? `${algo.label}算法需要高级版才能使用`
                              : `${algo.label} algorithm requires premium access`
                            )
                            setShowUpgradeModal(true)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2">
                              {algo.label}
                              {algo.premium && <Lock className="h-3 w-3 text-yellow-500" />}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {algo.description}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Compression Level */}
            <div className="space-y-2">
              <Label>
                {language === 'zh' ? '压缩级别' : 'Compression Level'} ({compressionLevel[0]})
              </Label>
              <Slider
                value={compressionLevel}
                onValueChange={setCompressionLevel}
                max={userType === 'free' ? freeUserLimits.maxCompressionLevel : premiumUserLimits.maxCompressionLevel}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{language === 'zh' ? '快速' : 'Fast'}</span>
                <span>{language === 'zh' ? '平衡' : 'Balanced'}</span>
                <span>{language === 'zh' ? '最佳' : 'Best'}</span>
              </div>
            </div>

            {/* Optimization Switch */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="optimization">
                  {language === 'zh' ? '智能优化' : 'Smart Optimization'}
                  {userType === 'free' && <Lock className="h-3 w-3 text-yellow-500 ml-1" />}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === 'zh' ? '自动选择最佳压缩参数' : 'Automatically select optimal compression parameters'}
                </p>
              </div>
              <Switch
                id="optimization"
                checked={isOptimized}
                onCheckedChange={(checked) => {
                  if (checked && userType === 'free') {
                    setUpgradeReason(language === 'zh' 
                      ? '智能优化功能需要高级版才能使用'
                      : 'Smart optimization requires premium access'
                    )
                    setShowUpgradeModal(true)
                    return
                  }
                  setIsOptimized(checked)
                }}
                disabled={userType === 'free'}
              />
            </div>

            {/* Progress */}
            {isCompressing && (
              <div className="space-y-2">
                <Label>{language === 'zh' ? '压缩进度' : 'Compression Progress'}</Label>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {progress < 100 
                    ? (language === 'zh' ? '正在压缩...' : 'Compressing...')
                    : (language === 'zh' ? '压缩完成' : 'Compression complete')
                  }
                </p>
              </div>
            )}

            {/* Compress Button */}
            <Button 
              onClick={startCompression} 
              disabled={!selectedFile || isCompressing}
              className="w-full"
            >
              {isCompressing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {language === 'zh' ? '压缩中...' : 'Compressing...'}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '开始压缩' : 'Start Compression'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === 'zh' ? '压缩结果' : 'Compression Results'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '查看压缩结果和下载文件' : 'View compression results and download files'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {compressionInfo ? (
              <>
                {/* Compression Statistics */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {compressionInfo.compressionRatio}:1
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'zh' ? '压缩比' : 'Compression Ratio'}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {compressionInfo.spaceSaved}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'zh' ? '节省空间' : 'Space Saved'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '原始大小' : 'Original Size'}:</span>
                      <span>{(compressionInfo.originalSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '压缩后大小' : 'Compressed Size'}:</span>
                      <span>{(compressionInfo.compressedSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '压缩算法' : 'Algorithm'}:</span>
                      <Badge variant="outline">{compressionInfo.algorithm.toUpperCase()}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '压缩级别' : 'Level'}:</span>
                      <span>{compressionInfo.level}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '耗时' : 'Time Spent'}:</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {compressionInfo.timeSpent}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download Section */}
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '下载选项' : 'Download Options'}</Label>
                  <Button
                    onClick={downloadCompressedFile}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '下载压缩文件' : 'Download Compressed File'}
                  </Button>
                </div>

                {/* Reset Button */}
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '压缩新文件' : 'Compress New File'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {language === 'zh' 
                    ? '选择文件并压缩后，结果将显示在这里' 
                    : 'Select a file and compress it to see results here'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Limits Info */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {language === 'zh' ? '免费版限制' : 'Free Plan Limits'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {language === 'zh' ? '最大文件大小' : 'Max file size'}: 50MB</li>
                <li>• {language === 'zh' ? '最大压缩级别' : 'Max compression level'}: 6</li>
                <li>• {language === 'zh' ? '支持算法' : 'Supported algorithms'}: 7种</li>
                <li>• {language === 'zh' ? '每日压缩次数' : 'Daily compressions'}: 10次</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Crown className="h-4 w-4" />
                {language === 'zh' ? '高级版特权' : 'Premium Plan Benefits'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {language === 'zh' ? '最大文件大小' : 'Max file size'}: 2GB</li>
                <li>• {language === 'zh' ? '最大压缩级别' : 'Max compression level'}: 9</li>
                <li>• {language === 'zh' ? '支持算法' : 'Supported algorithms'}: 100+种</li>
                <li>• {language === 'zh' ? '每日压缩次数' : 'Daily compressions'}: 1000次</li>
                <li>• {language === 'zh' ? '智能优化' : 'Smart optimization'}: ✓</li>
                <li>• {language === 'zh' ? '优先处理' : 'Priority processing'}: ✓</li>
              </ul>
            </div>
          </div>
          
          {/* Upgrade CTA */}
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-center">
              <h4 className="font-semibold mb-2 flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                {language === 'zh' ? '升级到高级版' : 'Upgrade to Premium'}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'zh' 
                  ? '解锁所有高级功能，享受更好的压缩体验' 
                  : 'Unlock all premium features for a better compression experience'
                }
              </p>
              <Button 
                onClick={() => {
                  setUpgradeReason('')
                  setShowUpgradeModal(true)
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Crown className="h-4 w-4 mr-2" />
                {language === 'zh' ? '立即升级' : 'Upgrade Now'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        reason={upgradeReason}
      />
    </div>
  )
} 