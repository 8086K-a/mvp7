import { notFound } from "next/navigation"
import { ToolLayout } from "@/components/tool-layout"
import { ToolAccessGuard } from "@/components/tool-access-guard"
import { JpegToPdfConverter } from "@/components/tools/jpeg-to-pdf-converter"
import { FileFormatConverter } from "@/components/tools/file-format-converter"
import { VideoToGifCreator } from "@/components/tools/video-to-gif-creator"
import { BulkImageResizer } from "@/components/tools/bulk-image-resizer"
import { QrCodeGenerator } from "@/components/tools/qr-code-generator"
import { CurrencyConverter } from "@/components/tools/currency-converter"
import { UnitConverter } from "@/components/tools/unit-converter"
import { TextUtilities } from "@/components/tools/text-utilities"
import { TimezoneConverter } from "@/components/tools/timezone-converter"
import { EmailMultiSender } from "@/components/tools/email-multi-sender"
import { TextMultiSender } from "@/components/tools/text-multi-sender"
import { SocialAutoPoster } from "@/components/tools/social-auto-poster"
import { DataScraperPro } from "@/components/tools/data-scraper-pro"
import { FileCompressor } from "@/components/tools/file-compressor"
import { FileDecompressor } from "@/components/tools/file-decompressor"
import { FileEncryptor } from "@/components/tools/file-encryptor"
import { FileDecryptor } from "@/components/tools/file-decryptor"
import { CloudDrive } from "@/components/tools/cloud-drive"
import { UniversalCapacityReducer } from "@/components/tools/universal-capacity-reducer"
import { UniversalMergeStudio } from "@/components/tools/universal-merge-studio"
import { UniversalSignatureStudio } from "@/components/tools/universal-signature-studio"
import { getTranslations } from "@/lib/i18n";
import { cookies } from "next/headers";
import { LANGUAGE_PREFERENCE_COOKIE_KEY, parseLanguagePreference } from "@/lib/i18n/language-preference"
import { getToolCreditCost } from "@/lib/credits/pricing"

const toolComponents = {
  "jpeg-to-pdf": JpegToPdfConverter,
  "file-format-converter": FileFormatConverter,
  "video-to-gif": VideoToGifCreator,
  "bulk-image-resizer": BulkImageResizer,
  "qr-generator": QrCodeGenerator,
  "currency-converter": CurrencyConverter,
  "unit-converter": UnitConverter,
  "text-utilities": TextUtilities,
  "timezone-converter": TimezoneConverter,
  "email-multi-sender": EmailMultiSender,
  "text-multi-sender": TextMultiSender,
  "social-auto-poster": SocialAutoPoster,
  "data-scraper": DataScraperPro,
  "file-compressor": FileCompressor,
  "file-decompressor": FileDecompressor,
  "universal-capacity-reducer": UniversalCapacityReducer,
  "universal-file-merger": UniversalMergeStudio,
  "universal-signature-editor": UniversalSignatureStudio,
  "file-encryptor": FileEncryptor,
  "file-decryptor": FileDecryptor,
  "cloud-drive": CloudDrive,
}

interface ToolPageProps {
  params: {
    toolId: string
  }
}

// 获取工具元数据
const getToolMetadata = (language: 'zh' | 'en') => {
  const t = getTranslations(language);

  return {
    "jpeg-to-pdf": {
      title: t.tools?.jpegToPdf?.name || "Image <-> PDF Converter",
      description: t.tools?.jpegToPdf?.description || "Convert images to PDF or extract images from PDFs",
      category: "file-converters",
    },
    "file-format-converter": {
      title: t.tools?.fileFormatConverter?.name || "File Format Converter",
      description: t.tools?.fileFormatConverter?.description || "Convert DOC, PPT, XLS files to PDF with batch processing",
      category: "file-converters",
    },
    "universal-capacity-reducer": {
      title: t.tools?.universalCapacityReducer?.name || "Universal Capacity Reducer",
      description:
        t.tools?.universalCapacityReducer?.description ||
        "Reduce file size for Word/PDF/PPT/Excel/Pics/Video/Audio with smart or lossless mode",
      category: "file-converters",
    },
    "universal-file-merger": {
      title: t.tools?.universalFileMerger?.name || "Universal File Merger",
      description:
        t.tools?.universalFileMerger?.description ||
        "Merge Word/PDF/PPT/Excel/Pics/Video/Audio with automatic media merge and package mode",
      category: "file-converters",
    },
    "universal-signature-editor": {
      title: t.tools?.universalSignatureEditor?.name || "Universal Signature Editor",
      description:
        t.tools?.universalSignatureEditor?.description ||
        "Sign Word/PDF/PPT/Excel/Pics/Video/Audio with visual image signing and integrity manifest",
      category: "file-converters",
    },
    "video-to-gif": {
      title: t.tools?.videoToGif?.name || "Video to GIF Creator",
      description: t.tools?.videoToGif?.description || "Create optimized GIFs from video clips with custom settings",
      category: "file-converters",
    },
    "bulk-image-resizer": {
      title: t.tools?.bulkImageResizer?.name || "Bulk Image Resizer",
      description: t.tools?.bulkImageResizer?.description || "Resize multiple images with aspect ratio and compression options",
      category: "file-converters",
    },
    "qr-generator": {
      title: t.tools?.qrGenerator?.name || "QR Code Generator",
      description: t.tools?.qrGenerator?.description || "Generate QR codes for URLs, text, WiFi, and contacts with customization",
      category: "productivity",
    },
    "currency-converter": {
      title: t.tools?.currencyConverter?.name || "Currency Converter",
      description: t.tools?.currencyConverter?.description || "Real-time exchange rates with historical data and bulk conversion",
      category: "productivity",
    },
    "unit-converter": {
      title: t.tools?.unitConverter?.name || "Unit Conversion Toolkit",
      description: t.tools?.unitConverter?.description || "Convert length, weight, temperature, and volume with custom formulas",
      category: "productivity",
    },
    "text-utilities": {
      title: t.tools?.textUtilities?.name || "Text Utilities Suite",
      description: t.tools?.textUtilities?.description || "Case conversion, word counting, and text formatting tools",
      category: "productivity",
    },
    "timezone-converter": {
      title: t.tools?.timezoneConverter?.name || "Time Zone Converter",
      description: t.tools?.timezoneConverter?.description || "Convert between time zones and schedule meetings globally",
      category: "productivity",
    },
    "email-multi-sender": {
      title: t.tools?.emailMultiSender?.name || "Email Multi Sender",
      description: t.tools?.emailMultiSender?.description || "Send personalized emails to multiple recipients with CSV upload and templates",
      category: "job-application",
    },
    "text-multi-sender": {
      title: t.tools?.textMultiSender?.name || "Text Multi Sender",
      description: t.tools?.textMultiSender?.description || "Bulk SMS and WhatsApp messaging with scheduling and personalization",
      category: "job-application",
    },
    "social-auto-poster": {
      title: t.tools?.socialAutoPoster?.name || "Social Media Auto Poster",
      description: t.tools?.socialAutoPoster?.description || "Schedule posts across Twitter, LinkedIn, and Facebook with analytics",
      category: "social-media",
    },
    "data-scraper": {
      title: t.tools?.dataScraper?.name || "Data Scraper Pro",
      description: t.tools?.dataScraper?.description || "Extract emails, phone numbers, and custom data from websites",
      category: "data-extraction",
    },
    "file-compressor": {
      title: t.tools?.fileCompressor?.name || "File Compressor",
      description: t.tools?.fileCompressor?.description || "Compress files locally with modern browser compression APIs",
      category: "file-converters",
    },
    "file-decompressor": {
      title: t.tools?.fileDecompressor?.name || "File Decompressor",
      description: t.tools?.fileDecompressor?.description || "Decompress Gzip/Deflate files locally in browser",
      category: "file-converters",
    },
    "file-encryptor": {
      title: t.tools?.fileEncryptor?.name || "File Encryptor",
      description: t.tools?.fileEncryptor?.description || "Encrypt files locally with AES-256-GCM",
      category: "productivity",
    },
    "file-decryptor": {
      title: t.tools?.fileDecryptor?.name || "File Decryptor",
      description: t.tools?.fileDecryptor?.description || "Decrypt local encrypted files with password",
      category: "productivity",
    },
    "cloud-drive": {
      title: t.tools?.cloudDrive?.name || "Cloud Drive",
      description: t.tools?.cloudDrive?.description || "Upload and manage files with shareable links",
      category: "productivity",
    },
  };
}

export default function ToolPage({ params }: ToolPageProps) {
  const { toolId } = params
  const ToolComponent = toolComponents[toolId as keyof typeof toolComponents]

  const language = (parseLanguagePreference(cookies().get(LANGUAGE_PREFERENCE_COOKIE_KEY)?.value) ?? 'zh') as 'zh' | 'en'

  const toolMetadata = getToolMetadata(language);
  const metadata = toolMetadata[toolId as keyof typeof toolMetadata]
  const creditCost = getToolCreditCost(toolId)

  if (!ToolComponent || !metadata) {
    notFound()
  }

  return (
      <ToolLayout
        toolId={toolId}
        title={metadata.title}
        description={metadata.description}
        category={metadata.category}
        language={language}
        creditCost={creditCost}
      >
        <ToolAccessGuard><ToolComponent /></ToolAccessGuard>
      </ToolLayout>
  )
}
