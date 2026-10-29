export const AD_PLACEMENTS = [
  "dashboard_top",
  "dashboard_middle",
  "dashboard_bottom",
  "downloads_top",
  "downloads_bottom",
  "sidebar",
  "sidebar_bottom",
  "tool_top",
  "tool_bottom",
] as const

export type AdPlacement = (typeof AD_PLACEMENTS)[number]

export function normalizeAdPlacement(value?: string | null): AdPlacement {
  const candidate = String(value || "").trim().toLowerCase()
  if (AD_PLACEMENTS.includes(candidate as AdPlacement)) {
    return candidate as AdPlacement
  }
  return "dashboard_top"
}

