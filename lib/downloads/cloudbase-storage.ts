let cloudbaseApp: any = null

async function getCloudbaseApp() {
  if (cloudbaseApp) return cloudbaseApp

  const env = process.env.NEXT_PUBLIC_WECHAT_CLOUDBASE_ID
  const secretId = process.env.CLOUDBASE_SECRET_ID
  const secretKey = process.env.CLOUDBASE_SECRET_KEY

  if (!env || !secretId || !secretKey) {
    throw new Error("CloudBase storage config missing")
  }

  const cloudbase = await import("@cloudbase/node-sdk")
  cloudbaseApp = cloudbase.default.init({
    env,
    secretId,
    secretKey,
  })

  return cloudbaseApp
}

export async function uploadToCloudbaseStorage(input: {
  fileName: string
  data: Buffer
  mimeType?: string
  directory?: string
}) {
  const app = await getCloudbaseApp()
  const timestamp = Date.now()
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const directory = String(input.directory || "downloads").replace(/^\/+|\/+$/g, "") || "downloads"
  const cloudPath = `${directory}/${timestamp}_${safeName}`

  const result = await app.uploadFile({
    cloudPath,
    fileContent: input.data,
  })

  return {
    fileID: String(result.fileID),
    cloudPath,
  }
}

export async function getCloudbaseTempFileURL(fileID: string): Promise<string> {
  const app = await getCloudbaseApp()
  const result = await app.getTempFileURL({ fileList: [fileID] })
  const first = Array.isArray(result?.fileList) ? result.fileList[0] : null
  const tempUrl = String(first?.tempFileURL || "")
  if (!tempUrl) {
    throw new Error("Failed to resolve CloudBase temp file URL")
  }
  return tempUrl
}

export async function deleteFromCloudbaseStorage(fileID: string) {
  if (!fileID) return

  const app = await getCloudbaseApp()
  await app.deleteFile({
    fileList: [fileID],
  })
}
