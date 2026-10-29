export const TOOL_SUCCESS_EVENT = "tool-action-success"

export interface ToolSuccessDetail {
  toolId: string
  /**
   * 业务侧能提供稳定单号时传入（例如任务 ID、上传批次 ID）。
   * 不传时由 ToolCreditConsumer 生成并持久化一个稳定 referenceId，
   * 保证网络重试 / 组件重挂载时复用同一个幂等键。
   */
  referenceId?: string
}

export function emitToolSuccess(toolId: string, referenceId?: string) {
  if (typeof window === "undefined") return
  const finalToolId = String(toolId || "").trim()
  if (!finalToolId) return

  const normalizedReferenceId = String(referenceId || "").trim().slice(0, 180)

  const detail: ToolSuccessDetail = {
    toolId: finalToolId,
    referenceId: normalizedReferenceId || undefined,
  }

  window.dispatchEvent(new CustomEvent<ToolSuccessDetail>(TOOL_SUCCESS_EVENT, { detail }))
}
