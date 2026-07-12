// page→param mapping สำหรับ filter ของ Vendor List

export function toIsBlacklistedParam(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined // 'all' หรือ undefined → ไม่ส่ง param
}

export function toCategoryIdParam(value: string | undefined): number | undefined {
  if (!value || value === 'all') return undefined
  return Number(value)
}

export function formatRating(ratingAvg: string | null): string {
  if (ratingAvg === null) return '—'
  return Number(ratingAvg).toFixed(1)
}
