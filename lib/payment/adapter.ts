export function getPayment() {
  return {
    async verifyPayment(params: Record<string, any>) {
      const orderId = String(params?.out_trade_no || params?.orderId || "")
      const transactionId = String(params?.trade_no || params?.transaction_id || "")
      return {
        success: false,
        orderId,
        transactionId,
        error: "Payment adapter not configured",
      }
    },
  }
}
