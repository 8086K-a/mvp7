export type RateLimitNext = () => void

function passthrough(_req: any, _res: any, next: RateLimitNext) {
  next()
}

export const apiRateLimit = passthrough
export const paymentRateLimit = passthrough
