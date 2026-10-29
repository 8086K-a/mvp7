export class StripeProvider {
  constructor(_env: any) {}

  async createPayment(_order: any): Promise<{ success: boolean; paymentId?: string; paymentUrl?: string }> {
    return { success: false }
  }

  async confirmPayment(_sessionId: string): Promise<{ success: boolean; transactionId: string; amount: number; currency: string }> {
    return { success: false, transactionId: "", amount: 0, currency: "USD" }
  }
}
