import type { UrlFilterConfig } from '@/shared/hooks/useUrlFilters'
import type { VendorListFilterValues } from '../components/VendorListFilterForm'

export const DEFAULT_VENDOR_FILTERS: VendorListFilterValues = {
  search: '',
  isBlacklisted: 'all',
  categoryId: 'all',
}

export function parseVendorFilters(params: URLSearchParams): VendorListFilterValues {
  const search = params.get('search') ?? '' // verbatim (no trim) — query/serialize trim instead
  const rawBl = params.get('isBlacklisted')
  const isBlacklisted = rawBl === 'true' || rawBl === 'false' ? rawBl : 'all'
  const rawCat = params.get('categoryId')
  // defensive = SYNTACTIC only (digits). ไม่เช็คว่ามีใน category list (membership = follow-up)
  const categoryId = rawCat && /^\d+$/.test(rawCat) ? rawCat : 'all'
  return { search, isBlacklisted, categoryId }
}

export function serializeVendorFilters(
  v: VendorListFilterValues,
  params: URLSearchParams,
): void {
  const s = v.search?.trim()
  if (s) params.set('search', s)
  else params.delete('search')
  if (v.isBlacklisted && v.isBlacklisted !== 'all') params.set('isBlacklisted', v.isBlacklisted)
  else params.delete('isBlacklisted')
  if (v.categoryId && v.categoryId !== 'all') params.set('categoryId', v.categoryId)
  else params.delete('categoryId')
}

export const vendorUrlFilterConfig: UrlFilterConfig<VendorListFilterValues> = {
  defaults: DEFAULT_VENDOR_FILTERS,
  parse: parseVendorFilters,
  serialize: serializeVendorFilters,
}
