import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

// Strictly parse a URL param as a plain decimal integer. Number() alone would let
// scientific notation ('1e21'), hex ('0x10'), whitespace (' 3') and beyond-safe
// integers through — values that would otherwise reach the API and 500 it.
function parseIntParam(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return Number.isSafeInteger(n) ? n : null
}

export function usePagination(initialPage = 1, initialLimit = 5) {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawPage = parseIntParam(searchParams.get('page'))
  const page = rawPage !== null && rawPage >= 1 ? rawPage : initialPage

  const rawLimit = parseIntParam(searchParams.get('limit'))
  const limit =
    rawLimit !== null && (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawLimit)
      ? rawLimit
      : initialLimit

  // normalize: ลบ param ที่ "มีอยู่ + invalid/non-canonical" ออกจาก URL (display ใช้ fallback อยู่แล้ว).
  // self-contained — ไม่พึ่ง totalPages (clamp แยกอยู่ useClampPageToTotal). auto-correction → replace.
  useEffect(() => {
    const pageRaw = searchParams.get('page')
    const limitRaw = searchParams.get('limit')
    // invalid = parse ไม่ผ่าน OR ผิด domain rule OR ไม่ canonical ('01' parse=1 แต่ String(1)!=='01')
    const pageInvalid =
      pageRaw !== null && (rawPage === null || rawPage < 1 || String(rawPage) !== pageRaw)
    const limitInvalid =
      limitRaw !== null &&
      (rawLimit === null ||
        !(PAGE_SIZE_OPTIONS as readonly number[]).includes(rawLimit) ||
        String(rawLimit) !== limitRaw)
    if (!pageInvalid && !limitInvalid) return
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (pageInvalid) params.delete('page')
        if (limitInvalid) params.delete('limit')
        return params
      },
      { replace: true },
    )
    // deps แคบโดยตั้งใจ: rawPage/rawLimit derive จาก searchParams, setSearchParams stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // merge-safe: clone prev params so unrelated keys (e.g. ?status=) are preserved
  function update(next: { page?: number; limit?: number }) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next.page !== undefined) params.set('page', String(next.page))
      if (next.limit !== undefined) params.set('limit', String(next.limit))
      return params
    })
  }

  function setPage(p: number) {
    update({ page: Math.max(1, p) })
  }

  function nextPage() {
    update({ page: page + 1 })
  }

  function prevPage() {
    update({ page: Math.max(1, page - 1) })
  }

  function goToPage(p: number) {
    update({ page: Math.max(1, p) })
  }

  // changing page size resets page=1 (avoid landing on a page that no longer exists)
  function setLimit(n: number) {
    update({ page: 1, limit: n })
  }

  // generic merge-safe write for callers that need to set page/limit together with
  // their own params (e.g. a status filter) in a SINGLE navigation — routing every
  // URL write through this one setSearchParams instance avoids two writers
  // clobbering each other when they fire in the same tick.
  function setParams(mutate: (params: URLSearchParams) => void) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      mutate(params)
      return params
    })
  }

  return { page, limit, setPage, nextPage, prevPage, goToPage, setLimit, setParams }
}
