import crypto from "crypto"
import fs from "fs"
import path from "path"

let privateKeySourceLogged = false

function normalizePemKey(raw?: string) {
  if (!raw) return ""
  return raw.trim().replace(/\\n/g, "\n")
}

function resolvePrivateKeyFromEnvFile() {
  const files = [".env.local", ".env"]
  for (const filename of files) {
    try {
      const fullpath = path.join(process.cwd(), filename)
      if (!fs.existsSync(fullpath)) continue
      const content = fs.readFileSync(fullpath, "utf8")
      const match = content.match(
        /WECHAT_PAY_PRIVATE_KEY\s*=\s*(-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----)/m
      )
      if (match?.[1]) {
        return match[1].trim()
      }
    } catch {
      // ignore
    }
  }
  return ""
}

function resolvePrivateKey() {
  const envPem = normalizePemKey(process.env.WECHAT_PAY_PRIVATE_KEY || "")
  if (envPem.includes("BEGIN") && envPem.includes("END")) {
    if (!privateKeySourceLogged && process.env.NODE_ENV !== "production") {
      console.info("[wechatpay] private key source: process.env.WECHAT_PAY_PRIVATE_KEY")
      privateKeySourceLogged = true
    }
    return envPem
  }

  const filePem = resolvePrivateKeyFromEnvFile()
  if (filePem) {
    if (!privateKeySourceLogged && process.env.NODE_ENV !== "production") {
      console.info("[wechatpay] private key source: .env.local/.env fallback")
      privateKeySourceLogged = true
    }
    return filePem
  }

  const base64Key = (process.env.WECHAT_PAY_PRIVATE_KEY_BASE64 || "").trim()
  if (base64Key) {
    try {
      const decoded = Buffer.from(base64Key, "base64").toString("utf8").trim()
      if (decoded.includes("BEGIN") && decoded.includes("END")) {
        if (!privateKeySourceLogged && process.env.NODE_ENV !== "production") {
          console.info("[wechatpay] private key source: WECHAT_PAY_PRIVATE_KEY_BASE64")
          privateKeySourceLogged = true
        }
        return decoded
      }
    } catch {
      // ignore
    }
  }

  return envPem
}

function assertPrivateKey(privateKey: string) {
  if (!privateKey) {
    throw new Error("WECHAT_PAY_PRIVATE_KEY is empty")
  }

  if (!privateKey.includes("BEGIN") || !privateKey.includes("END")) {
    throw new Error(
      "WECHAT_PAY_PRIVATE_KEY format invalid. Please keep full PEM (BEGIN/END PRIVATE KEY)."
    )
  }

  try {
    crypto.createPrivateKey({ key: privateKey, format: "pem" })
  } catch (error: any) {
    throw new Error(
      `WECHAT_PAY_PRIVATE_KEY parse failed: ${error?.message || "unsupported"}. ` +
        "If you use multiline .env value, keep BEGIN/END block complete."
    )
  }
}

function randomNonce(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length)
}

function getMerchantConfig() {
  const mchid = (process.env.WECHAT_PAY_MCH_ID || "").trim()
  const serial = (process.env.WECHAT_PAY_SERIAL_NO || "").trim()
  const privateKey = resolvePrivateKey()
  const appid = (process.env.WECHAT_APP_ID || process.env.WECHAT_PAY_APP_ID || "").trim()

  if (!mchid || !serial || !privateKey) {
    throw new Error(
      "WeChat Pay is not configured. Required: WECHAT_PAY_MCH_ID, WECHAT_PAY_SERIAL_NO, WECHAT_PAY_PRIVATE_KEY"
    )
  }

  assertPrivateKey(privateKey)

  return { mchid, serial, privateKey, appid }
}

function buildAuthorization(params: {
  method: string
  urlPathWithQuery: string
  body: string
  mchid: string
  serial: string
  privateKey: string
}) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomNonce(32)
  const message = `${params.method}\n${params.urlPathWithQuery}\n${timestamp}\n${nonce}\n${params.body}\n`
  const signature = crypto.createSign("RSA-SHA256").update(message).sign(params.privateKey, "base64")

  return `WECHATPAY2-SHA256-RSA2048 mchid="${params.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${params.serial}"`
}

async function requestWechatApi<T>(params: {
  method: "GET" | "POST"
  path: string
  query?: Record<string, string>
  body?: Record<string, any>
}) {
  const { mchid, serial, privateKey } = getMerchantConfig()
  const queryString = params.query
    ? `?${new URLSearchParams(params.query).toString()}`
    : ""
  const urlPathWithQuery = `${params.path}${queryString}`
  const requestBody = params.body ? JSON.stringify(params.body) : ""
  const authorization = buildAuthorization({
    method: params.method,
    urlPathWithQuery,
    body: requestBody,
    mchid,
    serial,
    privateKey,
  })

  const response = await fetch(`https://api.mch.weixin.qq.com${urlPathWithQuery}`, {
    method: params.method,
    headers: {
      Accept: "application/json",
      "Accept-Language": "zh-CN",
      Authorization: authorization,
      "User-Agent": "morntool-wechatpay-lite/1.0",
      ...(params.body ? { "Content-Type": "application/json" } : {}),
    },
    body: requestBody || undefined,
    cache: "no-store",
  })

  const rawText = await response.text()
  const data = rawText ? JSON.parse(rawText) : {}

  if (!response.ok) {
    throw new Error(`WeChat API ${response.status}: ${rawText}`)
  }

  return data as T
}

export async function createWechatNativeOrder(params: {
  description: string
  outTradeNo: string
  notifyUrl: string
  amountInCents: number
}) {
  const { mchid, appid } = getMerchantConfig()
  if (!appid) {
    throw new Error("WECHAT_APP_ID is required")
  }

  return requestWechatApi<{ code_url?: string; prepay_id?: string }>({
    method: "POST",
    path: "/v3/pay/transactions/native",
    body: {
      appid,
      mchid,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      amount: {
        total: params.amountInCents,
        currency: "CNY",
      },
    },
  })
}

export async function queryWechatOrderByOutTradeNo(outTradeNo: string) {
  const { mchid } = getMerchantConfig()
  return requestWechatApi<any>({
    method: "GET",
    path: `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}`,
    query: { mchid },
  })
}

export function getWechatAppId() {
  const { appid } = getMerchantConfig()
  return appid
}

export function getWechatMchId() {
  const { mchid } = getMerchantConfig()
  return mchid
}
