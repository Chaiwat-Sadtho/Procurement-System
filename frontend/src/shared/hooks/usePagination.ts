import { useState } from 'react'

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage)
  const [limit] = useState(initialLimit)

  function nextPage() {
    setPage((p) => p + 1)
  }

  function prevPage() {
    setPage((p) => Math.max(1, p - 1))
  }

  function goToPage(p: number) {
    setPage(Math.max(1, p))
  }

  return { page, limit, nextPage, prevPage, goToPage, setPage }
}
