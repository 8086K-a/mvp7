import crypto from "crypto"
import fs from "fs"
import path from "path"

type WechatPlatformCerts = Record<string, string>

type CachedCerts = {
  value: WechatPlatformCerts
  expiresAt: number
}

const certsCache = new Map<string, CachedCerts>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

function normalizePemKey(raw?: string) {
  if (!raw) return ""
  return raw.trim().replace(/\\n/g, "\n")
}

function resolveWechatPrivateKey() {
  const pem = normalizePemKey(process.env.WECHAT_PAY_PRIVATE_KEY || "")
  if (pem && pem.includes("BEGIN") && pem.includes("END")) return pem

  const fromEnvFile = resolveWechatPrivateKeyFromEnvFile()
  if (fromEnvFile) return fromEnvFile

  const base64Key = (process.env.WECHAT_PAY_PRIVATE_KEY_BASE64 || "").trim()
  if (!base64Key) return ""

  try {
    return Buffer.from(base64Key, "base64").toString("utf8").trim()
  } catch {
    return ""
  }
}

function resolveWechatPrivateKeyFromEnvFile() {
  const candidates = [".env.local", ".env"]
  for (const filename of candidates) {
    try {
      const fullpath = path.join(process.cwd(), filename)
      if (!fs.existsSync(fullpath)) continue

      const content = fs.readFileSync(fullpath, "utf8")
      const match = content.match(
        /WECHAT_PAY_PRIVATE_KEY\s*=\s*(-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----)/m
      )
      if (match?.[1]) {
        return match[1].trim()
      }
    } catch {
      // ignore parse failures and fallback
    }
  }

  return ""
}

function assertValidPrivateKey(privateKey: string) {
  if (!privateKey) {
    throw new Error("WECHAT_PAY_PRIVATE_KEY is empty")
  }

  if (!privateKey.includes("BEGIN") || !privateKey.includes("END")) {
    throw new Error(
      "WECHAT_PAY_PRIVATE_KEY format invalid. Use full PEM content (BEGIN/END PRIVATE KEY) with \\n line breaks."
    )
  }

  try {
    crypto.createPrivateKey({ key: privateKey, format: "pem" })
  } catch (error: any) {
    throw new Error(
      `WECHAT_PAY_PRIVATE_KEY parse failed: ${error?.message || "unsupported key format"}. ` +
        "Please provide PKCS#8 PEM private key (-----BEGIN PRIVATE KEY-----) in one env var using \\n separators."
    )
  }
}

function randomNonce(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length)
}

function getLocalCertsFromEnv(): WechatPlatformCerts | null {
  const certsJson = (process.env.WECHAT_PAY_CERTS || process.env.WECHAT_PAY_PLATFORM_CERTS || "").trim()
  if (certsJson) {
    try {
      const parsed = JSON.parse(certsJson)
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        return parsed as WechatPlatformCerts
      }
    } catch {
      // ignore invalid json
    }
  }

  const serial =
    (process.env.WECHAT_PAY_CERT_SERIAL_NO || process.env.WECHAT_PAY_PLATFORM_SERIAL_NO || "").trim()
  const cert = normalizePemKey(process.env.WECHAT_PAY_CERT_CONTENT || process.env.WECHAT_PAY_PLATFORM_CERT || "")

  if (serial && cert) {
    return { [serial]: cert }
  }

  return null
}

function signWechatRequest(params: {
  method: string
  urlPath: string
  body: string
  mchid: string
  serial: string
  privateKey: string
}) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomNonce(32)
  const message = `${params.method}\n${params.urlPath}\n${timestamp}\n${nonce}\n${params.body}\n`
  const signature = crypto.createSign("RSA-SHA256").update(message).sign(params.privateKey, "base64")

  return `WECHATPAY2-SHA256-RSA2048 mchid="${params.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${params.serial}"`
}

function decryptWechatCertificate(params: {
  ciphertext: string
  nonce: string
  associatedData?: string
  apiV3Key: string
}) {
  const ciphertext = Buffer.from(params.ciphertext, "base64")
  const authTag = ciphertext.subarray(ciphertext.length - 16)
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16)

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(params.apiV3Key, "utf8"),
    Buffer.from(params.nonce, "utf8")
  )

  decipher.setAAD(Buffer.from(params.associatedData || "", "utf8"))
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

async function downloadPlatformCertsFromWechat(params: {
  mchid: string
  serial: string
  privateKey: string
  apiV3Key: string
}) {
  const cacheKey = `${params.mchid}:${params.serial}`
  const cached = certsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const urlPath = "/v3/certificates"
  const body = ""
  const authorization = signWechatRequest({
    method: "GET",
    urlPath,
    body,
    mchid: params.mchid,
    serial: params.serial,
    privateKey: params.privateKey,
  })

  const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Language": "zh-CN",
      Authorization: authorization,
      "User-Agent": "morntool-wechatpay/1.0",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to download WeChat platform certs: ${response.status} ${text}`)
  }

  const payload: any = await response.json()
  const data = Array.isArray(payload?.data) ? payload.data : []
  if (data.length === 0) {
    throw new Error("No platform certificates returned from WeChat")
  }

  const certs: WechatPlatformCerts = {}
  for (const item of data) {
    const serialNo = String(item?.serial_no || "").trim()
    const encrypted = item?.encrypt_certificate
    if (!serialNo || !encrypted?.ciphertext || !encrypted?.nonce) {
      continue
    }

    const certPem = decryptWechatCertificate({
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      associatedData: encrypted.associated_data,
      apiV3Key: params.apiV3Key,
    })
    certs[serialNo] = certPem
  }

  if (Object.keys(certs).length === 0) {
    throw new Error("Unable to decrypt any WeChat platform certificates")
  }

  certsCache.set(cacheKey, {
    value: certs,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return certs
}

export async function buildWechatPayConfig() {
  const mchid = (process.env.WECHAT_PAY_MCH_ID || "").trim()
  const serial = (process.env.WECHAT_PAY_SERIAL_NO || "").trim()
  const privateKey = resolveWechatPrivateKey()
  const secret = (process.env.WECHAT_PAY_API_V3_KEY || "").trim()

  if (!mchid || !serial || !privateKey || !secret) {
    throw new Error(
      "WeChat Pay is not configured. Required: WECHAT_PAY_MCH_ID, WECHAT_PAY_SERIAL_NO, WECHAT_PAY_PRIVATE_KEY, WECHAT_PAY_API_V3_KEY"
    )
  }

  assertValidPrivateKey(privateKey)

  const localCerts = getLocalCertsFromEnv()
  const certs = localCerts || (await downloadPlatformCertsFromWechat({ mchid, serial, privateKey, apiV3Key: secret }))

  return {
    mchid,
    serial,
    privateKey,
    secret,
    certs,
    appid: process.env.WECHAT_APP_ID || process.env.WECHAT_PAY_APP_ID || "",
  }
}
