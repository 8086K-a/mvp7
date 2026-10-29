export class PayPalProvider {
  constructor(_env: any) {}

  async createPayment(_order: any): Promise<{ success: boolean; paymentId?: string; paymentUrl?: string }> {
    return { success: false }
  }

  async captureOnetimePayment(_token: string): Promise<any> {
    return { status: "FAILED", id: "" }
  }
}
