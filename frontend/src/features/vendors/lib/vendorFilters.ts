// Maps the vendor list's filter values onto query params

export function toIsBlacklistedParam(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined // 'all' or undefined → omit the param
}

export function toCategoryIdParam(value: string | undefined): number | undefined {
  if (!value || value === 'all') return undefined
  return Number(value)
}

export function formatRating(ratingAvg: string | null): string {
  if (ratingAvg === null) return '—'
  return Number(ratingAvg).toFixed(1)
}
