export type FileFamily =
  | "word"
  | "pdf"
  | "ppt"
  | "excel"
  | "pics"
  | "video"
  | "audio"
  | "other"

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "heic", "heif"])
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v", "3gp", "wmv"])
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "aac", "m4a", "flac", "ogg", "opus"])
const WORD_EXTENSIONS = new Set(["doc", "docx", "rtf", "odt"])
const PDF_EXTENSIONS = new Set(["pdf"])
const PPT_EXTENSIONS = new Set(["ppt", "pptx", "odp"])
const EXCEL_EXTENSIONS = new Set(["xls", "xlsx", "csv", "ods"])

function getExtension(fileName: string) {
  const parts = String(fileName || "").toLowerCase().split(".")
  if (parts.length <= 1) return ""
  return parts[parts.length - 1]
}

export function detectFileFamily(file: File): FileFamily {
  const extension = getExtension(file.name)
  const mime = String(file.type || "").toLowerCase()

  if (IMAGE_EXTENSIONS.has(extension) || mime.startsWith("image/")) return "pics"
  if (VIDEO_EXTENSIONS.has(extension) || mime.startsWith("video/")) return "video"
  if (AUDIO_EXTENSIONS.has(extension) || mime.startsWith("audio/")) return "audio"
  if (WORD_EXTENSIONS.has(extension) || mime.includes("wordprocessingml") || mime.includes("msword")) return "word"
  if (PDF_EXTENSIONS.has(extension) || mime === "application/pdf") return "pdf"
  if (PPT_EXTENSIONS.has(extension) || mime.includes("presentationml") || mime.includes("powerpoint")) return "ppt"
  if (EXCEL_EXTENSIONS.has(extension) || mime.includes("spreadsheetml") || mime.includes("excel")) return "excel"

  return "other"
}

export function sanitizeFileName(fileName: string) {
  const cleaned = String(fileName || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned || "file"
}

export function splitBaseName(fileName: string) {
  const safe = sanitizeFileName(fileName)
  const index = safe.lastIndexOf(".")
  if (index <= 0 || index === safe.length - 1) {
    return { base: safe, extension: "" }
  }
  return { base: safe.slice(0, index), extension: safe.slice(index + 1).toLowerCase() }
}

export function buildFileName(inputName: string, suffix: string, extension: string) {
  const { base } = splitBaseName(inputName)
  const ext = String(extension || "").replace(/^\./, "")
  if (!ext) return `${base}${suffix}`
  return `${base}${suffix}.${ext}`
}

export function toHumanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  const decimals = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(decimals)} ${units[index]}`
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = sanitizeFileName(fileName)
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function compressWithStream(file: File, algorithm: "gzip" | "deflate" = "gzip") {
  if (typeof CompressionStream === "undefined") {
    throw new Error("CompressionStream is not supported in this browser")
  }

  const stream = file.stream().pipeThrough(new CompressionStream(algorithm))
  return new Response(stream).blob()
}

export async function fileToBytes(file: File) {
  return new Uint8Array(await file.arrayBuffer())
}

function writeString(buffer: Uint8Array, offset: number, length: number, value: string) {
  const encoded = new TextEncoder().encode(value)
  const max = Math.min(length, encoded.length)
  buffer.fill(0, offset, offset + length)
  for (let index = 0; index < max; index += 1) {
    buffer[offset + index] = encoded[index]
  }
}

function writeOctal(buffer: Uint8Array, offset: number, length: number, value: number) {
  const normalized = Math.max(0, Math.floor(value))
  const octal = normalized.toString(8).padStart(length - 1, "0")
  const encoded = new TextEncoder().encode(`${octal}\0`)
  buffer.fill(0, offset, offset + length)
  buffer.set(encoded.slice(0, length), offset)
}

function createTarHeader(entryName: string, size: number, mtime: number) {
  const header = new Uint8Array(512)
  const safeName = sanitizeFileName(entryName).slice(0, 100)

  writeString(header, 0, 100, safeName)
  writeOctal(header, 100, 8, 0o644)
  writeOctal(header, 108, 8, 0)
  writeOctal(header, 116, 8, 0)
  writeOctal(header, 124, 12, size)
  writeOctal(header, 136, 12, mtime)

  for (let index = 148; index < 156; index += 1) {
    header[index] = 0x20
  }

  header[156] = "0".charCodeAt(0)
  writeString(header, 257, 6, "ustar")
  writeString(header, 263, 2, "00")

  const checksum = header.reduce((sum, item) => sum + item, 0)
  const checksumText = checksum.toString(8).padStart(6, "0")
  writeString(header, 148, 6, checksumText)
  header[154] = 0
  header[155] = 0x20

  return header
}

export type TarEntry = {
  name: string
  bytes: Uint8Array
  modifiedAt?: Date
}

export function createTarArchive(entries: TarEntry[]) {
  const chunks: Uint8Array[] = []

  for (const entry of entries) {
    const bytes = entry.bytes || new Uint8Array()
    const mtime = Math.floor((entry.modifiedAt?.getTime() || Date.now()) / 1000)
    const header = createTarHeader(entry.name, bytes.length, mtime)
    chunks.push(header)
    chunks.push(bytes)

    const remainder = bytes.length % 512
    if (remainder > 0) {
      chunks.push(new Uint8Array(512 - remainder))
    }
  }

  chunks.push(new Uint8Array(1024))
  return new Blob(chunks, { type: "application/x-tar" })
}

export async function sha256Hex(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const digestBytes = new Uint8Array(digest)
  return Array.from(digestBytes)
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("")
}

