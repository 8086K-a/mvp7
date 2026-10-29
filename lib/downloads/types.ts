export type PackageRegion = "CN" | "INTL"

export interface DownloadPackageRecord {
  id: string
  region: PackageRegion
  platform: string
  version: string
  title: string
  fileName: string
  fileSize: number
  mimeType: string
  releaseNotes?: string | null
  isActive: boolean
  downloadCount: number
  storageProvider: "cloudbase" | "supabase"
  storagePath: string
  createdAt: string
  updatedAt: string
}

export interface CreateDownloadPackageInput {
  region: PackageRegion
  platform: string
  version: string
  title: string
  fileName: string
  fileSize: number
  mimeType: string
  releaseNotes?: string | null
  isActive?: boolean
  storageProvider: "cloudbase" | "supabase"
  storagePath: string
}

export interface DownloadEventInput {
  packageId: string
  region: PackageRegion
  ip?: string | null
  userAgent?: string | null
  userId?: string | null
  userEmail?: string | null
}
