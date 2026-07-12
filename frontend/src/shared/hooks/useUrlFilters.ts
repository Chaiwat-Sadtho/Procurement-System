import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface UrlFilterConfig<T> {
  /** filter values เมื่อ URL ไม่มี param (หรือ param ผิด) */
  defaults: T
  /** อ่าน filter จาก URL — ต้อง defensive (param ผิด → fallback default, ไม่ throw) */
  parse: (params: URLSearchParams) => T
  /** เขียน canonical filter ลง params (mutate): set ค่าที่ไม่ใช่ default, delete ตัวที่เป็น default */
  serialize: (values: T, params: URLSearchParams) => void
  /**
   * commit/clear reset page=1 หรือไม่ (default true = หน้า paginated เช่น Vendors).
   * หน้า client-side filter ที่ไม่มี usePagination (Users) ตั้ง false → URL ไม่มี page ค้าง
   */
  resetPage?: boolean
}

export interface UseUrlFiltersResult<T> {
  /** = parse(searchParams) เสมอ (ไม่ขึ้นกับ q) */
  filters: T
  /** = searchParams.has('q') — sentinel "ค้นแล้ว"/auto-search */
  hasSearched: boolean
  /** string เสถียรของ filter param + q (ใช้เป็น form key); ไม่รวม page/limit */
  signature: string
  /** 1 navigation: serialize(values) + set q=1 + page=1 (คง limit/param อื่น) */
  commit: (values: T) => void
  /** 1 navigation: serialize(defaults)=ลบ filter + delete q + page=1 (คง limit) */
  clear: () => void
}

type Action<T> = { kind: 'commit'; values: T } | { kind: 'clear' }

export function useUrlFilters<T>(config: UrlFilterConfig<T>): UseUrlFiltersResult<T> {
  const [searchParams, setSearchParams] = useSearchParams()
  const [action, setAction] = useState<Action<T> | null>(null)

  const filters = useMemo(
    () => config.parse(searchParams),
    // config = stable module-level object per page (same eslint-disable pattern as usePagination)
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

  // a commit/clear triggered by RHF handleSubmit runs in an
  // async microtask where setSearchParams (= navigate) is a no-op — only setState survives.
  // So commit/clear record intent via setState (action); the URL is written here in a normal
  // post-commit effect (React-managed flow → the write lands). The effect keys on `action`
  // alone (NOT searchParams) so pagination's URL writes never re-trigger it, and it performs
  // no setState of its own (that would trip react-hooks/set-state-in-effect) — each commit/
  // clear stores a fresh object, so the effect fires exactly once per action with no clear
  // needed. StrictMode's double-invoked mount effect is a no-op (action === null on mount).
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
      if (config.resetPage !== false) p.set('page', '1') // paginated pages reset to page 1 (result set changes); non-paginated (Users) opt out
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
