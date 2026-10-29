export function logInfo(message: string, meta?: any) {
  console.log(`[info] ${message}`, meta || "")
}

export function logWarn(message: string, meta?: any) {
  console.warn(`[warn] ${message}`, meta || "")
}

export function logError(message: string, error?: any, meta?: any) {
  console.error(`[error] ${message}`, error || "", meta || "")
}

export function logBusinessEvent(event: string, userId?: string, payload?: any) {
  console.log(`[business] ${event}`, { userId, ...(payload || {}) })
}

export function logSecurityEvent(event: string, userId?: string, ip?: string, payload?: any) {
  console.warn(`[security] ${event}`, { userId, ip, ...(payload || {}) })
}
