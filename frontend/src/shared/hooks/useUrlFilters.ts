import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface UrlFilterConfig<T> {
  /** filter values when the URL has no param (or a bad one) */
  defaults: T
  /** read filters from the URL — must be defensive (bad param → default, never throw) */
  parse: (params: URLSearchParams) => T
  /** write canonical filters into params (mutates): set non-defaults, delete defaults */
  serialize: (values: T, params: URLSearchParams) => void
  /** reset page=1 on commit/clear (default true); client-side-filter pages without usePagination set false */
  resetPage?: boolean
}

export interface UseUrlFiltersResult<T> {
  /** = parse(searchParams), always */
  filters: T
  /** = searchParams.has('q') — the "has searched" sentinel */
  hasSearched: boolean
  /** stable string of the filter params + q (used as a form key); excludes page/limit */
  signature: string
  /** one navigation: serialize(values) + q=1 + page=1 (keeps limit) */
  commit: (values: T) => void
  /** one navigation: clear every filter + q, page=1 (keeps limit) */
  clear: () => void
}

type Action<T> = { kind: 'commit'; values: T } | { kind: 'clear' }

export function useUrlFilters<T>(config: UrlFilterConfig<T>): UseUrlFiltersResult<T> {
  const [searchParams, setSearchParams] = useSearchParams()
  const [action, setAction] = useState<Action<T> | null>(null)

  const filters = useMemo(
    () => config.parse(searchParams),
    // config is a stable module-level object per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams],
  )

  const hasSearched = searchParams.has('q')

  const signature = useMemo(() => {
    const p = new URLSearchParams()
    config.serialize(filters, p) // canonical filter params only — no page/limit
    return (hasSearched ? 'q&' : '') + p.toString()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, hasSearched])

  // setSearchParams is a no-op inside RHF's async handleSubmit microtask, so commit/clear only record
  // intent and the URL is written here. Keyed on `action` alone → pagination's writes never re-trigger it.
  useEffect(() => {
    if (!action) return
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev) // clone → preserves limit + any unrelated keys
      if (action.kind === 'commit') {
        config.serialize(action.values, p)
        p.set('q', '1')
      } else {
        config.serialize(config.defaults, p) // defaults serialize → deletes every filter key
        p.delete('q')
      }
      if (config.resetPage !== false) p.set('page', '1') // non-paginated pages (Users) opt out
      return p
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])

  return {
    filters,
    hasSearched,
    signature,
    commit: (values: T) => setAction({ kind: 'commit', values }),
    clear: () => setAction({ kind: 'clear' }),
  }
}
