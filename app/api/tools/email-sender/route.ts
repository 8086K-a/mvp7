import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { grantReferralFirstUseReward } from "@/lib/market/referrals"

const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024

type ParsedPayload = {
  smtpConfig: any
  mailOptions: any
  attachments: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

function isConnectionTimeoutError(error: any): boolean {
  const code = String(error?.code || '').toUpperCase()
  const command = String(error?.command || '').toUpperCase()
  const message = String(error?.message || '').toLowerCase()

  return (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    command === 'CONN' ||
    message.includes('timed out') ||
    message.includes('connect etimedout')
  )
}

function createTransporter(smtpConfig: any, port: number) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port,
    secure: port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 12000,
  })
}

async function verifyAndSendWithPort(port: number, smtpConfig: any, mailOptions: any) {
  const transporter = createTransporter(smtpConfig, port)
  await transporter.verify()
  return transporter.sendMail({
    from: `"${mailOptions.fromName || smtpConfig.user}" <${smtpConfig.user}>`,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
    attachments: Array.isArray(mailOptions.attachments) ? mailOptions.attachments : undefined,
  })
}

function parseJsonText(value: FormDataEntryValue | null, key: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing ${key}`)
  }

  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`Invalid JSON for ${key}`)
  }
}

async function parsePayload(req: Request): Promise<ParsedPayload> {
  const contentType = String(req.headers.get('content-type') || '').toLowerCase()

  if (!contentType.includes('multipart/form-data')) {
    const body = await req.json()
    return {
      smtpConfig: body?.smtpConfig,
      mailOptions: body?.mailOptions,
      attachments: [],
    }
  }

  const formData = await req.formData()
  const smtpConfig = parseJsonText(formData.get('smtpConfig'), 'smtpConfig')
  const mailOptions = parseJsonText(formData.get('mailOptions'), 'mailOptions')
  const files = formData.getAll('attachments').filter((value): value is File => value instanceof File)

  if (files.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`Too many attachments. Maximum ${MAX_ATTACHMENT_COUNT} files are allowed.`)
  }

  let totalSize = 0
  const attachments: ParsedPayload['attachments'] = []

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`Attachment ${file.name} exceeds ${Math.floor(MAX_ATTACHMENT_SIZE / 1024 / 1024)}MB.`)
    }

    totalSize += file.size
    if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      throw new Error(`Total attachments exceed ${Math.floor(MAX_TOTAL_ATTACHMENT_SIZE / 1024 / 1024)}MB.`)
    }

    attachments.push({
      filename: file.name || `attachment_${Date.now()}`,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || undefined,
    })
  }

  return { smtpConfig, mailOptions, attachments }
}

export async function POST(req: Request) {
  try {
    const { smtpConfig, mailOptions, attachments } = await parsePayload(req)
    const requestUserId = String(req.headers.get("x-user-id") || "").trim()

    if (!smtpConfig || !mailOptions) {
      return NextResponse.json(
        { success: false, error: 'Missing configuration or mail options' },
        { status: 400 }
      )
    }

    const primaryPort = Number(smtpConfig.port)
    const finalMailOptions = {
      ...mailOptions,
      attachments,
    }

    let info: any

    try {
      info = await verifyAndSendWithPort(primaryPort, smtpConfig, finalMailOptions)
    } catch (verifyError: any) {
      console.error('SMTP Connection Failed:', verifyError)
      return NextResponse.json(
        {
          success: false,
          errorCode: isConnectionTimeoutError(verifyError)
            ? 'SMTP_NETWORK_UNREACHABLE'
            : 'SMTP_AUTH_OR_CONFIG_ERROR',
          error: `SMTP Connection Failed: ${verifyError.message}`,
          userMessage: isConnectionTimeoutError(verifyError)
            ? 'SMTP 服务器网络不可达或端口被拦截，请检查当前端口出站连接。'
            : 'SMTP 认证或配置有误，请检查主机、端口、用户名和应用专用密码。',
        },
        { status: 401 }
      )
    }

    console.log('Message sent: %s', info.messageId)

    if (requestUserId) {
      await grantReferralFirstUseReward({
        invitedUserId: requestUserId,
        toolId: "email-multi-sender",
      }).catch(() => null)
    }

    return NextResponse.json({ success: true, messageId: info.messageId, usedPort: primaryPort })
  } catch (error: any) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
