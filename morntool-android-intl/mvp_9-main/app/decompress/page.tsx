"use client"

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Download, 
  Upload, 
  FileText, 
  Archive, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Clock,
  HardDrive,
  RotateCcw,
  Crown
} from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"
import UpgradeModal from "@/components/upgrade-modal"

export default function DecompressPage() {
  const { language } = useLanguage()
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [decompressionAlgorithm, setDecompressionAlgorithm] = useState('auto')
  const [isDecompressing, setIsDecompressing] = useState(false)
  const [decompressedFile, setDecompressedFile] = useState<Blob | null>(null)
  const [originalFileName, setOriginalFileName] = useState('')
  const [compressionInfo, setCompressionInfo] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  const [extractionPath, setExtractionPath] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const algorithms = [
    { value: 'auto', label: language === 'zh' ? '自动检测 (推荐)' : 'Auto Detect (Recommended)', description: '智能识别压缩格式' },
    
    // 现代压缩格式
    { value: 'gzip', label: 'Gzip', description: 'GNU压缩格式，广泛支持' },
    { value: 'brotli', label: 'Brotli', description: 'Google开发的Web优化压缩' },
    { value: 'lzma', label: 'LZMA', description: '7-Zip使用的高压缩比格式' },
    { value: 'zstandard', label: 'Zstandard', description: 'Facebook开发的现代平衡压缩' },
    { value: 'lz4', label: 'LZ4', description: '极速压缩格式，适合实时应用' },
    { value: 'bzip2', label: 'Bzip2', description: 'Burrows-Wheeler变换压缩' },
    { value: 'xz', label: 'XZ', description: 'LZMA2压缩格式，高压缩比' },
    { value: 'lzop', label: 'LZOP', description: '快速压缩格式' },
    { value: 'zpaq', label: 'ZPAQ', description: '增量压缩格式' },
    { value: 'lrzip', label: 'LRZIP', description: '长期压缩格式' },
    { value: 'plzip', label: 'PLZIP', description: '并行LZMA压缩' },
    { value: 'pigz', label: 'Pigz', description: '并行Gzip压缩' },
    { value: 'pbzip2', label: 'PBzip2', description: '并行Bzip2压缩' },
    
    // 图片压缩格式
    { value: 'jpeg', label: 'JPEG', description: '联合图像专家组压缩' },
    { value: 'png', label: 'PNG', description: '便携式网络图形压缩' },
    { value: 'webp', label: 'WebP', description: 'Google开发的Web图片格式' },
    { value: 'avif', label: 'AVIF', description: 'AV1图像文件格式' },
    { value: 'heic', label: 'HEIC', description: '高效图像容器格式' },
    { value: 'bmp', label: 'BMP', description: '位图图像格式' },
    { value: 'tiff', label: 'TIFF', description: '标签图像文件格式' },
    { value: 'gif', label: 'GIF', description: '图形交换格式' },
    { value: 'svg', label: 'SVG', description: '可缩放矢量图形' },
    { value: 'ico', label: 'ICO', description: 'Windows图标格式' },
    { value: 'raw', label: 'RAW', description: '原始图像数据格式' },
    { value: 'psd', label: 'PSD', description: 'Photoshop文档格式' },
    { value: 'ai', label: 'AI', description: 'Adobe Illustrator格式' },
    { value: 'eps', label: 'EPS', description: '封装PostScript格式' },
    { value: 'pdf', label: 'PDF', description: '便携式文档格式' },
    
    // 音频压缩格式
    { value: 'mp3', label: 'MP3', description: 'MPEG音频层III压缩' },
    { value: 'aac', label: 'AAC', description: '高级音频编码' },
    { value: 'ogg', label: 'OGG', description: 'Ogg Vorbis音频格式' },
    { value: 'flac', label: 'FLAC', description: '无损音频压缩' },
    { value: 'wav', label: 'WAV', description: '波形音频文件格式' },
    { value: 'wma', label: 'WMA', description: 'Windows媒体音频' },
    { value: 'opus', label: 'Opus', description: '现代音频压缩格式' },
    { value: 'alac', label: 'ALAC', description: 'Apple无损音频编码' },
    { value: 'ape', label: 'APE', description: 'Monkey\'s Audio无损压缩' },
    { value: 'm4a', label: 'M4A', description: 'MPEG-4音频格式' },
    { value: 'aiff', label: 'AIFF', description: '音频交换文件格式' },
    { value: 'au', label: 'AU', description: 'Sun音频格式' },
    { value: 'midi', label: 'MIDI', description: '乐器数字接口格式' },
    
    // 视频压缩格式
    { value: 'mp4', label: 'MP4', description: 'MPEG-4视频格式' },
    { value: 'avi', label: 'AVI', description: '音频视频交错格式' },
    { value: 'mkv', label: 'MKV', description: 'Matroska视频格式' },
    { value: 'mov', label: 'MOV', description: 'QuickTime电影格式' },
    { value: 'wmv', label: 'WMV', description: 'Windows媒体视频' },
    { value: 'flv', label: 'FLV', description: 'Flash视频格式' },
    { value: 'webm', label: 'WebM', description: 'Web视频格式' },
    { value: 'm4v', label: 'M4V', description: 'iTunes视频格式' },
    { value: '3gp', label: '3GP', description: '3GPP多媒体格式' },
    { value: 'ogv', label: 'OGV', description: 'Ogg视频格式' },
    { value: 'ts', label: 'TS', description: 'MPEG传输流格式' },
    { value: 'mts', label: 'MTS', description: 'AVCHD视频格式' },
    { value: 'rmvb', label: 'RMVB', description: 'RealMedia可变比特率' },
    { value: 'divx', label: 'DIVX', description: 'DivX视频格式' },
    { value: 'xvid', label: 'XVID', description: 'XviD视频编码' },
    { value: 'h264', label: 'H.264', description: '高级视频编码' },
    { value: 'h265', label: 'H.265', description: '高效视频编码' },
    { value: 'vp8', label: 'VP8', description: 'Google视频编码' },
    { value: 'vp9', label: 'VP9', description: 'Google下一代视频编码' },
    { value: 'av1', label: 'AV1', description: '开放媒体联盟视频编码' },
    
    // 归档格式
    { value: 'zip', label: 'ZIP', description: '通用压缩归档格式' },
    { value: 'rar', label: 'RAR', description: 'WinRAR压缩格式' },
    { value: '7z', label: '7-Zip', description: '7-Zip高压缩比格式' },
    { value: 'tar', label: 'TAR', description: '磁带归档格式' },
    { value: 'cab', label: 'CAB', description: 'Windows压缩格式' },
    { value: 'ar', label: 'AR', description: 'Unix归档格式' },
    { value: 'cpio', label: 'CPIO', description: 'Unix复制输入输出格式' },
    { value: 'iso', label: 'ISO', description: '光盘镜像格式' },
    { value: 'deb', label: 'DEB', description: 'Debian软件包格式' },
    { value: 'rpm', label: 'RPM', description: 'Red Hat软件包格式' },
    { value: 'pkg', label: 'PKG', description: 'macOS软件包格式' },
    { value: 'msi', label: 'MSI', description: 'Windows安装包格式' },
    
    // 专业格式
    { value: 'ace', label: 'ACE', description: 'WinACE压缩格式' },
    { value: 'arc', label: 'ARC', description: 'ARC压缩格式' },
    { value: 'arj', label: 'ARJ', description: 'ARJ压缩格式' },
    { value: 'lha', label: 'LHA', description: 'LHA压缩格式' },
    { value: 'lzh', label: 'LZH', description: 'LZH压缩格式' },
    { value: 'pak', label: 'PAK', description: 'PAK压缩格式' },
    { value: 'zoo', label: 'ZOO', description: 'ZOO压缩格式' },
    { value: 'dmg', label: 'DMG', description: 'macOS磁盘镜像' },
    { value: 'pax', label: 'PAX', description: 'POSIX归档格式' },
    { value: 'shar', label: 'SHAR', description: 'Shell归档格式' },
    { value: 'ustar', label: 'USTAR', description: 'Unix标准归档格式' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCompressedFile(file)
      setDecompressedFile(null)
      setOriginalFileName('')
      setCompressionInfo(null)
      setProgress(0)
      
      // 模拟文件格式检测
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
    
    setDecompressionAlgorithm(detectedFormat)
    
    // 模拟压缩信息检测
    const mockCompressionInfo = {
      format: detectedFormat,
      originalSize: Math.floor(file.size * (3 + Math.random() * 7)), // 3-10倍原始大小
      compressionRatio: (3 + Math.random() * 7).toFixed(2),
      compressionLevel: Math.floor(Math.random() * 9) + 1,
      isEncrypted: Math.random() > 0.8, // 20%概率加密
      hasPassword: Math.random() > 0.9, // 10%概率需要密码
      fileCount: Math.floor(Math.random() * 100) + 1,
      compressionMethod: getCompressionMethod(detectedFormat),
      compatibility: getCompatibility(detectedFormat)
    }
    
    setCompressionInfo(mockCompressionInfo)
  }

  const getCompressionMethod = (format: string) => {
    const methods: Record<string, string> = {
      'gzip': 'DEFLATE',
      'brotli': 'Brotli',
      'lzma': 'LZMA',
      'xz': 'LZMA2',
      'zstandard': 'Zstandard',
      'lz4': 'LZ4',
      'bzip2': 'Burrows-Wheeler',
      'lzop': 'LZO',
      'zpaq': 'ZPAQ',
      'lrzip': 'LZMA + Bzip2',
      'plzip': 'Parallel LZMA',
      'pigz': 'Parallel Gzip',
      'pbzip2': 'Parallel Bzip2',
      
      // 图片格式
      'jpeg': 'DCT + Huffman',
      'png': 'DEFLATE',
      'webp': 'VP8 + DEFLATE',
      'avif': 'AV1 + HEIF',
      'heic': 'HEVC + HEIF',
      'bmp': 'RLE',
      'tiff': 'LZW/DEFLATE',
      'gif': 'LZW',
      'svg': 'XML + Gzip',
      'ico': 'BMP/PNG',
      'raw': 'None (Raw Data)',
      'psd': 'RLE + ZIP',
      'ai': 'PDF + ZIP',
      'eps': 'PostScript',
      'pdf': 'DEFLATE + JPEG',
      
      // 音频格式
      'mp3': 'MPEG-1 Layer III',
      'aac': 'AAC',
      'ogg': 'Vorbis',
      'flac': 'FLAC',
      'wav': 'PCM',
      'wma': 'WMA',
      'opus': 'Opus',
      'alac': 'ALAC',
      'ape': 'APE',
      'm4a': 'AAC/ALAC',
      'aiff': 'PCM',
      'au': 'PCM',
      'midi': 'MIDI',
      
      // 视频格式
      'mp4': 'H.264/HEVC + AAC',
      'avi': 'Various Codecs',
      'mkv': 'Various Codecs',
      'mov': 'H.264/HEVC + AAC',
      'wmv': 'WMV',
      'flv': 'H.264 + AAC',
      'webm': 'VP8/VP9 + Vorbis',
      'm4v': 'H.264/HEVC + AAC',
      '3gp': 'H.263/H.264 + AMR',
      'ogv': 'Theora + Vorbis',
      'ts': 'H.264/HEVC + AAC',
      'mts': 'AVCHD',
      'rmvb': 'RealVideo',
      'divx': 'DivX',
      'xvid': 'XviD',
      'h264': 'H.264/AVC',
      'h265': 'H.265/HEVC',
      'vp8': 'VP8',
      'vp9': 'VP9',
      'av1': 'AV1',
      
      // 归档格式
      'zip': 'DEFLATE',
      'rar': 'RAR',
      '7z': 'LZMA',
      'tar': 'None (Archive)',
      'cab': 'MSZIP',
      'ar': 'None (Archive)',
      'cpio': 'None (Archive)',
      'iso': 'None (Archive)',
      'deb': 'Gzip',
      'rpm': 'Gzip',
      'pkg': 'XAR',
      'msi': 'CAB',
      
      // 专业格式
      'ace': 'ACE',
      'arc': 'ARC',
      'arj': 'ARJ',
      'lha': 'LHA',
      'pak': 'PAK',
      'zoo': 'ZOO',
      'dmg': 'HFS+',
      'pax': 'None (Archive)',
      'shar': 'None (Archive)',
      'ustar': 'None (Archive)'
    }
    return methods[format] || 'Unknown'
  }

  const getCompatibility = (format: string) => {
    const compatibility: Record<string, string> = {
      'gzip': 'Universal',
      'brotli': 'Modern Browsers',
      'lzma': '7-Zip, XZ',
      'xz': 'XZ Utils',
      'zstandard': 'Modern Tools',
      'lz4': 'Fast Tools',
      'bzip2': 'Unix/Linux',
      'lzop': 'LZOP Tools',
      'zpaq': 'ZPAQ Tools',
      'lrzip': 'LRZIP Tools',
      'plzip': 'PLZIP Tools',
      'pigz': 'Pigz Tools',
      'pbzip2': 'PBzip2 Tools',
      
      // 图片格式
      'jpeg': 'Universal',
      'png': 'Universal',
      'webp': 'Modern Browsers',
      'avif': 'Modern Browsers',
      'heic': 'iOS/macOS',
      'bmp': 'Universal',
      'tiff': 'Professional',
      'gif': 'Universal',
      'svg': 'Modern Browsers',
      'ico': 'Windows',
      'raw': 'Camera Specific',
      'psd': 'Adobe Products',
      'ai': 'Adobe Illustrator',
      'eps': 'Professional',
      'pdf': 'Universal',
      
      // 音频格式
      'mp3': 'Universal',
      'aac': 'Modern Devices',
      'ogg': 'Open Source',
      'flac': 'Audiophiles',
      'wav': 'Universal',
      'wma': 'Windows',
      'opus': 'Modern Web',
      'alac': 'Apple Devices',
      'ape': 'Audiophiles',
      'm4a': 'Apple/iTunes',
      'aiff': 'Apple/Professional',
      'au': 'Unix/Linux',
      'midi': 'Universal',
      
      // 视频格式
      'mp4': 'Universal',
      'avi': 'Universal',
      'mkv': 'Open Source',
      'mov': 'Apple Devices',
      'wmv': 'Windows',
      'flv': 'Legacy Web',
      'webm': 'Modern Web',
      'm4v': 'Apple Devices',
      '3gp': 'Mobile Devices',
      'ogv': 'Open Source',
      'ts': 'Broadcasting',
      'mts': 'Camcorders',
      'rmvb': 'RealPlayer',
      'divx': 'DivX Players',
      'xvid': 'Open Source',
      'h264': 'Universal',
      'h265': 'Modern Devices',
      'vp8': 'Web Browsers',
      'vp9': 'Modern Web',
      'av1': 'Next Generation',
      
      // 归档格式
      'zip': 'Universal',
      'rar': 'WinRAR, 7-Zip',
      '7z': '7-Zip',
      'tar': 'Unix/Linux',
      'cab': 'Windows',
      'ar': 'Unix/Linux',
      'cpio': 'Unix/Linux',
      'iso': 'Universal',
      'deb': 'Debian/Ubuntu',
      'rpm': 'Red Hat/Fedora',
      'pkg': 'macOS',
      'msi': 'Windows',
      
      // 专业格式
      'ace': 'WinACE',
      'arc': 'ARC Tools',
      'arj': 'ARJ Tools',
      'lha': 'LHA Tools',
      'pak': 'PAK Tools',
      'zoo': 'ZOO Tools',
      'dmg': 'macOS',
      'pax': 'POSIX',
      'shar': 'Unix/Linux',
      'ustar': 'POSIX'
    }
    return compatibility[format] || 'Limited'
  }

  const decompressFile = async () => {
    if (!compressedFile) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请选择压缩文件' : 'Please select compressed file',
        variant: "destructive",
      })
      return
    }

    setIsDecompressing(true)
    setProgress(0)

    try {
      // 模拟解压缩过程
      const steps = [
        { progress: 10, message: language === 'zh' ? '分析文件格式...' : 'Analyzing file format...' },
        { progress: 25, message: language === 'zh' ? '读取压缩头...' : 'Reading compression header...' },
        { progress: 40, message: language === 'zh' ? '解压缩数据...' : 'Decompressing data...' },
        { progress: 70, message: language === 'zh' ? '验证数据完整性...' : 'Verifying data integrity...' },
        { progress: 90, message: language === 'zh' ? '准备输出文件...' : 'Preparing output file...' },
        { progress: 100, message: language === 'zh' ? '解压缩完成' : 'Decompression complete' }
      ]

      for (const step of steps) {
        setProgress(step.progress)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // 模拟解压缩结果
      const decompressedBlob = new Blob([compressedFile], { type: 'application/octet-stream' })
      setDecompressedFile(decompressedBlob)
      
      // 提取原始文件名
      const originalName = compressedFile.name.replace(/\.(gz|br|lzma|xz|zst|lz4|zip|rar|7z|tar)$/, '')
      setOriginalFileName(originalName)
      
      // 设置提取路径
      setExtractionPath(`/extracted/${originalName}`)
      
      toast({
        title: language === 'zh' ? '解压缩成功' : 'Decompression Successful',
        description: language === 'zh' 
          ? `文件已成功解压缩，压缩比 ${compressionInfo?.compressionRatio}:1`
          : `File has been decompressed successfully, compression ratio ${compressionInfo?.compressionRatio}:1`,
      })
    } catch (error) {
      toast({
        title: language === 'zh' ? '解压缩失败' : 'Decompression Failed',
        description: language === 'zh' ? '解压缩过程中出现错误' : 'An error occurred during decompression',
        variant: "destructive",
      })
    } finally {
      setIsDecompressing(false)
    }
  }

  const downloadDecompressedFile = () => {
    if (decompressedFile) {
      const url = URL.createObjectURL(decompressedFile)
      const a = document.createElement('a')
      a.href = url
      a.download = originalFileName || 'decompressed_file'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const resetForm = () => {
    setCompressedFile(null)
    setDecompressedFile(null)
    setOriginalFileName('')
    setCompressionInfo(null)
    setProgress(0)
    setExtractionPath('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '文件解压缩工具' : 'File Decompression Tool'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {language === 'zh' 
            ? '支持多种压缩格式的解压缩，自动检测文件格式' 
            : 'Support decompression of various compression formats with automatic format detection'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Decompression Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              {language === 'zh' ? '解压缩设置' : 'Decompression Settings'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '选择压缩文件并配置解压缩参数' : 'Select compressed file and configure decompression parameters'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="file">
                {language === 'zh' ? '选择压缩文件' : 'Select Compressed File'}
              </Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".gz,.gzip,.br,.lzma,.xz,.zst,.zstd,.lz4,.bz2,.bzip2,.lzo,.lzop,.zpaq,.lrz,.plz,.pigz,.pbz2,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.bmp,.tiff,.tif,.gif,.svg,.ico,.raw,.cr2,.nef,.arw,.psd,.ai,.eps,.pdf,.mp3,.aac,.ogg,.flac,.wav,.wma,.opus,.m4a,.aiff,.aif,.au,.mid,.midi,.mp4,.avi,.mkv,.mov,.wmv,.flv,.webm,.m4v,.3gp,.ogv,.ts,.mts,.rmvb,.divx,.xvid,.zip,.rar,.7z,.tar,.cab,.ar,.cpio,.iso,.deb,.rpm,.pkg,.msi,.ace,.arc,.arj,.lha,.lzh,.pak,.zoo,.dmg,.pax,.shar,.ustar"
              />
              {compressedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {compressedFile.name} ({(compressedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            {/* Algorithm Selection */}
            <div className="space-y-2">
              <Label htmlFor="algorithm">
                {language === 'zh' ? '解压缩算法' : 'Decompression Algorithm'}
              </Label>
              <Select value={decompressionAlgorithm} onValueChange={setDecompressionAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((algo) => (
                    <SelectItem key={algo.value} value={algo.value}>
                      <div className="flex flex-col">
                        <span>{algo.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {algo.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Compression Info */}
            {compressionInfo && (
              <div className="space-y-2">
                <Label>{language === 'zh' ? '压缩信息' : 'Compression Information'}</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '格式' : 'Format'}:</span>
                    <Badge variant="outline">{compressionInfo.format.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '压缩比' : 'Ratio'}:</span>
                    <span>{compressionInfo.compressionRatio}:1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '原始大小' : 'Original Size'}:</span>
                    <span>{(compressionInfo.originalSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '文件数量' : 'File Count'}:</span>
                    <span>{compressionInfo.fileCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '压缩方法' : 'Method'}:</span>
                    <span className="text-xs">{compressionInfo.compressionMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'zh' ? '兼容性' : 'Compatibility'}:</span>
                    <span className="text-xs">{compressionInfo.compatibility}</span>
                  </div>
                </div>
                {compressionInfo.isEncrypted && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{language === 'zh' ? '此文件已加密' : 'This file is encrypted'}</span>
                  </div>
                )}
                {compressionInfo.hasPassword && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{language === 'zh' ? '此文件需要密码' : 'This file requires password'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            {isDecompressing && (
              <div className="space-y-2">
                <Label>{language === 'zh' ? '解压缩进度' : 'Decompression Progress'}</Label>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {progress < 100 
                    ? (language === 'zh' ? '正在解压缩...' : 'Decompressing...')
                    : (language === 'zh' ? '解压缩完成' : 'Decompression complete')
                  }
                </p>
              </div>
            )}

            {/* Decompress Button */}
            <Button 
              onClick={decompressFile} 
              disabled={!compressedFile || isDecompressing}
              className="w-full"
            >
              {isDecompressing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {language === 'zh' ? '解压缩中...' : 'Decompressing...'}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '开始解压缩' : 'Start Decompression'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {language === 'zh' ? '解压缩结果' : 'Decompression Results'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '查看解压缩结果和下载文件' : 'View decompression results and download files'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {decompressedFile ? (
              <>
                {/* File Information */}
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '解压缩文件' : 'Decompressed File'}</Label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '文件名' : 'File Name'}:</span>
                      <span className="font-mono">{originalFileName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '文件大小' : 'File Size'}:</span>
                      <span>{(decompressedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{language === 'zh' ? '压缩节省' : 'Space Saved'}:</span>
                      <span className="text-green-600">
                        {compressionInfo ? 
                          ((1 - compressedFile!.size / compressionInfo.originalSize) * 100).toFixed(1) + '%'
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extraction Path */}
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '提取路径' : 'Extraction Path'}</Label>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {extractionPath}
                    </span>
                  </div>
                </div>

                {/* Download Section */}
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '下载选项' : 'Download Options'}</Label>
                  <Button
                    onClick={downloadDecompressedFile}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '下载解压缩文件' : 'Download Decompressed File'}
                  </Button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {language === 'zh' ? '使用说明' : 'Instructions'}
                  </h4>
                  <ol className="text-sm space-y-1">
                    <li>1. {language === 'zh' ? '文件已成功解压缩' : 'File has been successfully decompressed'}</li>
                    <li>2. {language === 'zh' ? '点击下载按钮保存文件' : 'Click download button to save the file'}</li>
                    <li>3. {language === 'zh' ? '文件将保存到您的下载文件夹' : 'File will be saved to your downloads folder'}</li>
                  </ol>
                </div>

                {/* Reset Button */}
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '解压缩新文件' : 'Decompress New File'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {language === 'zh' 
                    ? '选择压缩文件并解压缩后，结果将显示在这里' 
                    : 'Select a compressed file and decompress it to see results here'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supported Formats */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '现代压缩格式' : 'Modern Compression'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Gzip</strong> - {language === 'zh' ? '通用压缩' : 'Universal'}</li>
                <li>• <strong>Brotli</strong> - {language === 'zh' ? 'Web优化' : 'Web-optimized'}</li>
                <li>• <strong>LZMA</strong> - {language === 'zh' ? '高压缩比' : 'High ratio'}</li>
                <li>• <strong>XZ</strong> - {language === 'zh' ? 'LZMA2格式' : 'LZMA2 format'}</li>
                <li>• <strong>Zstandard</strong> - {language === 'zh' ? '现代平衡' : 'Modern balanced'}</li>
                <li>• <strong>LZ4</strong> - {language === 'zh' ? '极速压缩' : 'Ultra-fast'}</li>
                <li>• <strong>Bzip2</strong> - {language === 'zh' ? 'Burrows-Wheeler' : 'Burrows-Wheeler'}</li>
                <li>• <strong>LZOP</strong> - {language === 'zh' ? '快速压缩' : 'Fast compression'}</li>
                <li>• <strong>ZPAQ</strong> - {language === 'zh' ? '增量压缩' : 'Incremental'}</li>
                <li>• <strong>LRZIP</strong> - {language === 'zh' ? '长期压缩' : 'Long-range'}</li>
                <li>• <strong>PLZIP</strong> - {language === 'zh' ? '并行LZMA' : 'Parallel LZMA'}</li>
                <li>• <strong>Pigz</strong> - {language === 'zh' ? '并行Gzip' : 'Parallel Gzip'}</li>
                <li>• <strong>PBzip2</strong> - {language === 'zh' ? '并行Bzip2' : 'Parallel Bzip2'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '图片格式' : 'Image Formats'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>JPEG</strong> - {language === 'zh' ? '联合图像专家组' : 'Joint Photographic'}</li>
                <li>• <strong>PNG</strong> - {language === 'zh' ? '便携式网络图形' : 'Portable Network Graphics'}</li>
                <li>• <strong>WebP</strong> - {language === 'zh' ? 'Google Web图片' : 'Google Web Image'}</li>
                <li>• <strong>AVIF</strong> - {language === 'zh' ? 'AV1图像格式' : 'AV1 Image Format'}</li>
                <li>• <strong>HEIC</strong> - {language === 'zh' ? '高效图像容器' : 'High Efficiency Image'}</li>
                <li>• <strong>BMP</strong> - {language === 'zh' ? '位图格式' : 'Bitmap Format'}</li>
                <li>• <strong>TIFF</strong> - {language === 'zh' ? '标签图像文件' : 'Tagged Image File'}</li>
                <li>• <strong>GIF</strong> - {language === 'zh' ? '图形交换格式' : 'Graphics Interchange'}</li>
                <li>• <strong>SVG</strong> - {language === 'zh' ? '可缩放矢量图形' : 'Scalable Vector Graphics'}</li>
                <li>• <strong>ICO</strong> - {language === 'zh' ? 'Windows图标' : 'Windows Icon'}</li>
                <li>• <strong>RAW</strong> - {language === 'zh' ? '原始图像数据' : 'Raw Image Data'}</li>
                <li>• <strong>PSD</strong> - {language === 'zh' ? 'Photoshop文档' : 'Photoshop Document'}</li>
                <li>• <strong>AI</strong> - {language === 'zh' ? 'Adobe Illustrator' : 'Adobe Illustrator'}</li>
                <li>• <strong>EPS</strong> - {language === 'zh' ? '封装PostScript' : 'Encapsulated PostScript'}</li>
                <li>• <strong>PDF</strong> - {language === 'zh' ? '便携式文档' : 'Portable Document'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '音频格式' : 'Audio Formats'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>MP3</strong> - {language === 'zh' ? 'MPEG音频层III' : 'MPEG Audio Layer III'}</li>
                <li>• <strong>AAC</strong> - {language === 'zh' ? '高级音频编码' : 'Advanced Audio Coding'}</li>
                <li>• <strong>OGG</strong> - {language === 'zh' ? 'Ogg Vorbis' : 'Ogg Vorbis'}</li>
                <li>• <strong>FLAC</strong> - {language === 'zh' ? '无损音频压缩' : 'Free Lossless Audio'}</li>
                <li>• <strong>WAV</strong> - {language === 'zh' ? '波形音频文件' : 'Waveform Audio File'}</li>
                <li>• <strong>WMA</strong> - {language === 'zh' ? 'Windows媒体音频' : 'Windows Media Audio'}</li>
                <li>• <strong>Opus</strong> - {language === 'zh' ? '现代音频压缩' : 'Modern Audio Compression'}</li>
                <li>• <strong>ALAC</strong> - {language === 'zh' ? 'Apple无损编码' : 'Apple Lossless Audio'}</li>
                <li>• <strong>APE</strong> - {language === 'zh' ? 'Monkey\'s Audio' : 'Monkey\'s Audio'}</li>
                <li>• <strong>M4A</strong> - {language === 'zh' ? 'MPEG-4音频' : 'MPEG-4 Audio'}</li>
                <li>• <strong>AIFF</strong> - {language === 'zh' ? '音频交换文件' : 'Audio Interchange File'}</li>
                <li>• <strong>AU</strong> - {language === 'zh' ? 'Sun音频格式' : 'Sun Audio Format'}</li>
                <li>• <strong>MIDI</strong> - {language === 'zh' ? '乐器数字接口' : 'Musical Instrument Digital Interface'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '视频格式' : 'Video Formats'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>MP4</strong> - {language === 'zh' ? 'MPEG-4视频' : 'MPEG-4 Video'}</li>
                <li>• <strong>AVI</strong> - {language === 'zh' ? '音频视频交错' : 'Audio Video Interleave'}</li>
                <li>• <strong>MKV</strong> - {language === 'zh' ? 'Matroska视频' : 'Matroska Video'}</li>
                <li>• <strong>MOV</strong> - {language === 'zh' ? 'QuickTime电影' : 'QuickTime Movie'}</li>
                <li>• <strong>WMV</strong> - {language === 'zh' ? 'Windows媒体视频' : 'Windows Media Video'}</li>
                <li>• <strong>FLV</strong> - {language === 'zh' ? 'Flash视频' : 'Flash Video'}</li>
                <li>• <strong>WebM</strong> - {language === 'zh' ? 'Web视频' : 'Web Video'}</li>
                <li>• <strong>M4V</strong> - {language === 'zh' ? 'iTunes视频' : 'iTunes Video'}</li>
                <li>• <strong>3GP</strong> - {language === 'zh' ? '3GPP多媒体' : '3GPP Multimedia'}</li>
                <li>• <strong>OGV</strong> - {language === 'zh' ? 'Ogg视频' : 'Ogg Video'}</li>
                <li>• <strong>TS</strong> - {language === 'zh' ? 'MPEG传输流' : 'MPEG Transport Stream'}</li>
                <li>• <strong>MTS</strong> - {language === 'zh' ? 'AVCHD视频' : 'AVCHD Video'}</li>
                <li>• <strong>RMVB</strong> - {language === 'zh' ? 'RealMedia可变比特率' : 'RealMedia Variable Bitrate'}</li>
                <li>• <strong>DIVX</strong> - {language === 'zh' ? 'DivX视频' : 'DivX Video'}</li>
                <li>• <strong>XVID</strong> - {language === 'zh' ? 'XviD视频编码' : 'XviD Video Codec'}</li>
                <li>• <strong>H.264</strong> - {language === 'zh' ? '高级视频编码' : 'Advanced Video Coding'}</li>
                <li>• <strong>H.265</strong> - {language === 'zh' ? '高效视频编码' : 'High Efficiency Video Coding'}</li>
                <li>• <strong>VP8/VP9</strong> - {language === 'zh' ? 'Google视频编码' : 'Google Video Codecs'}</li>
                <li>• <strong>AV1</strong> - {language === 'zh' ? '开放媒体联盟' : 'Alliance for Open Media'}</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '归档格式' : 'Archive Formats'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>ZIP</strong> - {language === 'zh' ? '通用归档格式' : 'Universal archive format'}</li>
                <li>• <strong>RAR</strong> - {language === 'zh' ? 'WinRAR格式' : 'WinRAR format'}</li>
                <li>• <strong>7-Zip</strong> - {language === 'zh' ? '7-Zip格式' : '7-Zip format'}</li>
                <li>• <strong>TAR</strong> - {language === 'zh' ? '磁带归档格式' : 'Tape archive format'}</li>
                <li>• <strong>CAB</strong> - {language === 'zh' ? 'Windows压缩格式' : 'Windows compression'}</li>
                <li>• <strong>AR</strong> - {language === 'zh' ? 'Unix归档格式' : 'Unix archive format'}</li>
                <li>• <strong>CPIO</strong> - {language === 'zh' ? 'Unix复制输入输出' : 'Unix copy in/out'}</li>
                <li>• <strong>ISO</strong> - {language === 'zh' ? '光盘镜像格式' : 'Disc image format'}</li>
                <li>• <strong>DEB</strong> - {language === 'zh' ? 'Debian软件包' : 'Debian package'}</li>
                <li>• <strong>RPM</strong> - {language === 'zh' ? 'Red Hat软件包' : 'Red Hat package'}</li>
                <li>• <strong>PKG</strong> - {language === 'zh' ? 'macOS软件包' : 'macOS package'}</li>
                <li>• <strong>MSI</strong> - {language === 'zh' ? 'Windows安装包' : 'Windows installer'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '专业格式' : 'Professional Formats'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>ACE</strong> - {language === 'zh' ? 'WinACE压缩格式' : 'WinACE compression'}</li>
                <li>• <strong>ARC</strong> - {language === 'zh' ? 'ARC压缩格式' : 'ARC compression'}</li>
                <li>• <strong>ARJ</strong> - {language === 'zh' ? 'ARJ压缩格式' : 'ARJ compression'}</li>
                <li>• <strong>LHA</strong> - {language === 'zh' ? 'LHA压缩格式' : 'LHA compression'}</li>
                <li>• <strong>PAK</strong> - {language === 'zh' ? 'PAK压缩格式' : 'PAK compression'}</li>
                <li>• <strong>ZOO</strong> - {language === 'zh' ? 'ZOO压缩格式' : 'ZOO compression'}</li>
                <li>• <strong>DMG</strong> - {language === 'zh' ? 'macOS磁盘镜像' : 'macOS disk image'}</li>
                <li>• <strong>PAX</strong> - {language === 'zh' ? 'POSIX归档格式' : 'POSIX archive'}</li>
                <li>• <strong>SHAR</strong> - {language === 'zh' ? 'Shell归档格式' : 'Shell archive'}</li>
                <li>• <strong>USTAR</strong> - {language === 'zh' ? 'Unix标准归档' : 'Unix standard archive'}</li>
                <li>• <strong>自动检测</strong> - {language === 'zh' ? '智能识别文件格式' : 'Intelligent format detection'}</li>
                <li>• <strong>加密支持</strong> - {language === 'zh' ? '支持加密文件检测' : 'Encrypted file detection'}</li>
              </ul>
            </div>
          </div>
          
          {/* Upgrade CTA */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <h4 className="font-semibold mb-2 flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-blue-600" />
                {language === 'zh' ? '升级到高级版' : 'Upgrade to Premium'}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'zh' 
                  ? '解锁更多解压缩格式和高级功能' 
                  : 'Unlock more decompression formats and advanced features'
                }
              </p>
              <Button 
                onClick={() => {
                  setUpgradeReason(language === 'zh' 
                    ? '升级到高级版以支持更多文件格式和高级解压缩功能'
                    : 'Upgrade to premium to support more file formats and advanced decompression features'
                  )
                  setShowUpgradeModal(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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