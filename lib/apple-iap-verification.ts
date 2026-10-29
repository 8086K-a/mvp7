export async function verifyAppleSubscription(
  _transactionId: string,
  _bundleId: string,
  _productId: string,
  _production: boolean
): Promise<{ isValid: boolean; errorMessage?: string; expiresDate?: number; autoRenewStatus?: boolean }> {
  return {
    isValid: false,
    errorMessage: "Apple verification adapter is not configured",
  }
}
