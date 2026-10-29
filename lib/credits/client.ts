import { getToolCreditCost } from "@/lib/credits/pricing"

export async function consumeToolCredits(options: {
  userId: string
  toolId: string
  referenceId?: string
}): Promise<{ newCredits: number } | { error: string }> {
  const cost = getToolCreditCost(options.toolId)
  if (!cost) {
    return { error: "Unknown tool" }
  }

  try {
    const response = await fetch("/api/credits/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: options.userId,
        toolId: options.toolId,
        referenceId: options.referenceId,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      return { error: result?.error || "Failed to consume credits" }
    }

    return { newCredits: result.newCredits }
  } catch (error: any) {
    return { error: error?.message || "Failed to consume credits" }
  }
}
