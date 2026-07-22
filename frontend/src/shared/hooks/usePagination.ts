import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

// Strict decimal-integer parse: Number() alone would let '1e21', '0x10', ' 3' and unsafe integers
// through to the API, where they 500.
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

  // Strip params that are present but invalid — the display already falls back, so correct the URL
  // with replace. Independent of totalPages, which useClampPageToTotal handles.
  useEffect(() => {
    const pageRaw = searchParams.get('page')
    const limitRaw = searchParams.get('limit')
    // invalid = unparsable, outside the allowed values, or non-canonical ('01' parses to 1)
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
    // deps kept narrow on purpose: rawPage/rawLimit derive from searchParams, setSearchParams is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Clone prev params so unrelated keys (e.g. ?status=) survive
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

  // One shared writer, so a caller setting page/limit together with its own params in the same tick
  // cannot clobber the other's navigation
  function setParams(mutate: (params: URLSearchParams) => void) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      mutate(params)
      return params
    })
  }

  return { page, limit, setPage, nextPage, prevPage, goToPage, setLimit, setParams }
}

// Clamp a page beyond totalPages. Separate from usePagination because totalPages comes from the query
// that usePagination's own page/limit drive.
export function useClampPageToTotal(totalPages?: number) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawPage = parseIntParam(searchParams.get('page'))
  const page = rawPage !== null && rawPage >= 1 ? rawPage : 1

  useEffect(() => {
    if (totalPages === undefined || totalPages < 1 || page <= totalPages) return
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('page', String(totalPages))
        return params
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages])
}
