import { describe, it, expect } from 'vitest'
import { type ReactNode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { useUrlFilters, type UrlFilterConfig } from '@/shared/hooks/useUrlFilters'

interface TestFilters {
  search: string
  isBlacklisted: string
  categoryId: string
}

const testDefaults: TestFilters = { search: '', isBlacklisted: 'all', categoryId: 'all' }

// inline config (เลียน vendor) — keep the hook test decoupled from the vendor module
const testConfig: UrlFilterConfig<TestFilters> = {
  defaults: testDefaults,
  parse: (params) => ({
    search: params.get('search') ?? '',
    isBlacklisted: params.get('isBlacklisted') ?? 'all',
    categoryId: params.get('categoryId') ?? 'all',
  }),
  serialize: (v, params) => {
    if (v.search?.trim()) params.set('search', v.search.trim())
    else params.delete('search')
    if (v.isBlacklisted && v.isBlacklisted !== 'all') params.set('isBlacklisted', v.isBlacklisted)
    else params.delete('isBlacklisted')
    if (v.categoryId && v.categoryId !== 'all') params.set('categoryId', v.categoryId)
    else params.delete('categoryId')
  },
}

function wrapperWith(initialEntries: string[]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  )
}

// render hook + expose live searchParams + a raw setter (to simulate pagination writes)
function renderUrlFilters(initialEntries: string[]) {
  return renderHook(
    () => {
      const api = useUrlFilters(testConfig)
      const [params, setParams] = useSearchParams()
      return { api, params, setParams }
    },
    { wrapper: wrapperWith(initialEntries) },
  )
}

describe('useUrlFilters', () => {
  it('1. no params → filters = defaults, hasSearched = false', () => {
    const { result } = renderUrlFilters(['/'])
    expect(result.current.api.filters).toEqual(testDefaults)
    expect(result.current.api.hasSearched).toBe(false)
  })

  it('2. ?q=1&search=acme → filters.search = acme, hasSearched = true', () => {
    const { result } = renderUrlFilters(['/?q=1&search=acme'])
    expect(result.current.api.filters.search).toBe('acme')
    expect(result.current.api.hasSearched).toBe(true)
  })

  it('3. ?search=acme (no q) → filters parsed but hasSearched = false (parse is independent of q)', () => {
    const { result } = renderUrlFilters(['/?search=acme'])
    expect(result.current.api.filters.search).toBe('acme')
    expect(result.current.api.hasSearched).toBe(false)
  })

  it('4. commit writes canonical params: search + q + page=1, default fields omitted', () => {
    const { result } = renderUrlFilters(['/'])
    act(() => result.current.api.commit({ search: 'x', isBlacklisted: 'all', categoryId: 'all' }))
    const p = result.current.params
    expect(p.get('search')).toBe('x')
    expect(p.has('q')).toBe(true)
    expect(p.get('page')).toBe('1')
    expect(p.has('isBlacklisted')).toBe(false)
    expect(p.has('categoryId')).toBe(false)
  })

  it('5. commit preserves an existing limit param (merge-safe)', () => {
    const { result } = renderUrlFilters(['/?limit=20'])
    act(() => result.current.api.commit({ search: 'x', isBlacklisted: 'all', categoryId: 'all' }))
    expect(result.current.params.get('limit')).toBe('20')
  })

  it('6. clear removes q + filter params, sets page=1, keeps limit', () => {
    const { result } = renderUrlFilters(['/?q=1&search=acme&limit=20'])
    act(() => result.current.api.clear())
    const p = result.current.params
    expect(p.has('q')).toBe(false)
    expect(p.has('search')).toBe(false)
    expect(p.get('page')).toBe('1')
    expect(p.get('limit')).toBe('20')
  })

  it('7. commit(defaults) still persists q + page=1 with all filter params stripped (default-only search)', () => {
    const { result } = renderUrlFilters(['/'])
    act(() => result.current.api.commit(testDefaults))
    const p = result.current.params
    expect(p.has('q')).toBe(true)
    expect(p.get('page')).toBe('1')
    expect(p.has('search')).toBe(false)
    expect(p.has('isBlacklisted')).toBe(false)
    expect(p.has('categoryId')).toBe(false)
  })

  it('8. signature is byte-identical across a page change, but differs on a filter/q change', () => {
    const { result } = renderUrlFilters(['/'])
    act(() => result.current.api.commit({ search: 'acme', isBlacklisted: 'all', categoryId: 'all' }))
    const sigAfterSearch = result.current.api.signature
    // change only page (simulate pagination) → signature must NOT change
    act(() =>
      result.current.setParams((prev) => {
        const p = new URLSearchParams(prev)
        p.set('page', '2')
        return p
      }),
    )
    expect(result.current.api.signature).toBe(sigAfterSearch)
    // change the filter → signature MUST change
    act(() => result.current.api.commit({ search: 'beta', isBlacklisted: 'all', categoryId: 'all' }))
    expect(result.current.api.signature).not.toBe(sigAfterSearch)
  })
})

// resetPage defaults to true (paginated pages reset to page 1 on commit/clear).
// A non-paginated page (Users — client-side filtering, no usePagination) opts out via
// `resetPage: false` so the URL stays clean (no inert page=1).
describe('useUrlFilters with resetPage: false (non-paginated page)', () => {
  const noResetConfig: UrlFilterConfig<TestFilters> = { ...testConfig, resetPage: false }

  function renderNoReset(initialEntries: string[]) {
    return renderHook(
      () => {
        const api = useUrlFilters(noResetConfig)
        const [params] = useSearchParams()
        return { api, params }
      },
      { wrapper: wrapperWith(initialEntries) },
    )
  }

  it('commit writes q + filters but no page param', () => {
    const { result } = renderNoReset(['/'])
    act(() => result.current.api.commit({ search: 'x', isBlacklisted: 'all', categoryId: 'all' }))
    const p = result.current.params
    expect(p.has('q')).toBe(true)
    expect(p.get('search')).toBe('x')
    expect(p.has('page')).toBe(false)
  })

  it('clear removes q + filters and writes no page param', () => {
    const { result } = renderNoReset(['/?q=1&search=acme'])
    act(() => result.current.api.clear())
    const p = result.current.params
    expect(p.has('q')).toBe(false)
    expect(p.has('search')).toBe(false)
    expect(p.has('page')).toBe(false)
  })
})
