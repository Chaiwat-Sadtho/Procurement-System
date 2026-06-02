import { useSearchParams } from 'react-router-dom'

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

export function usePagination(initialPage = 1, initialLimit = 5) {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawPage = Number(searchParams.get('page'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : initialPage

  const rawLimit = Number(searchParams.get('limit'))
  const limit = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawLimit)
    ? rawLimit
    : initialLimit

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
