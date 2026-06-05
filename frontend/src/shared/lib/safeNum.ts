/**
 * Coerce a possibly non-numeric / non-finite value to a finite number, defaulting to 0.
 * Number(undefined) -> NaN, Number('abc') -> NaN, Number('1e999') -> Infinity all collapse to 0,
 * so neither NaN/Infinity can leak into arithmetic (-> NaN totals) nor into a display (-> "฿NaN").
 * Shared by the PR/PO/GRN form schemas (mapper bound checks) and the dashboard budget boundary.
 */
export function safeNum(v: string | number | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
