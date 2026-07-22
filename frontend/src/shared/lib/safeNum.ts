/**
 * Coerce any value to a finite number, defaulting to 0, so NaN/Infinity can never leak into a total
 * or a formatted amount. Shared by the PR/PO/GRN form schemas and the dashboard budget cards.
 */
export function safeNum(v: string | number | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
