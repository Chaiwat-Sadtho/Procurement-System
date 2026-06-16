import { describe, it, expect } from 'vitest'
import { useEffect, StrictMode, type ReactNode } from 'react'
import { renderHook, act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { usePagination, PAGE_SIZE_OPTIONS, useClampPageToTotal } from '@/shared/hooks/usePagination'

function wrapperWith(initialEntries: string[]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  )
}

describe('usePagination', () => {
  it('exposes the page-size options', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([5, 10, 20, 50])
  })

  it('defaults to page 1 / limit 5 when the URL has no params', () => {
    const { result } = renderHook(() => usePagination(), { wrapper: wrapperWith(['/']) })
    expect(result.current.page).toBe(1)
    expect(result.current.limit).toBe(5)
  })

  it('reads page and limit from the URL', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: wrapperWith(['/?page=3&limit=20']),
    })
    expect(result.current.page).toBe(3)
    expect(result.current.limit).toBe(20)
  })

  it('falls back to defaults for invalid URL params', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: wrapperWith(['/?page=abc&limit=7']),
    })
    expect(result.current.page).toBe(1)
    expect(result.current.limit).toBe(5)
  })

  it('setLimit sets the limit and resets page to 1', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: wrapperWith(['/?page=4&limit=5']),
    })
    act(() => result.current.setLimit(20))
    expect(result.current.limit).toBe(20)
    expect(result.current.page).toBe(1)
  })

  it('nextPage / prevPage move within bounds and clamp at 1', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: wrapperWith(['/?page=2&limit=5']),
    })
    act(() => result.current.nextPage())
    expect(result.current.page).toBe(3)
    act(() => result.current.prevPage())
    expect(result.current.page).toBe(2)
    act(() => result.current.setPage(1))
    act(() => result.current.prevPage())
    expect(result.current.page).toBe(1)
  })

  it('preserves unrelated query params (e.g. status) when changing page size', async () => {
    function Probe() {
      const { limit, setLimit } = usePagination()
      const [params] = useSearchParams()
      return (
        <div>
          <span data-testid="limit">{limit}</span>
          <span data-testid="status">{params.get('status') ?? ''}</span>
          <button onClick={() => setLimit(10)}>change</button>
        </div>
      )
    }
    render(
      <MemoryRouter initialEntries={['/?status=draft&limit=5']}>
        <Probe />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('change'))
    expect(screen.getByTestId('limit')).toHaveTextContent('10')
    expect(screen.getByTestId('status')).toHaveTextContent('draft')
  })

  // spec edge-case table: ?page=0 / ?page=-3 / non-integer all fall back to 1
  it.each(['/?page=0', '/?page=-3', '/?page=2.5', '/?page=abc'])(
    'falls back to page 1 for invalid page param %s',
    (entry) => {
      const { result } = renderHook(() => usePagination(), { wrapper: wrapperWith([entry]) })
      expect(result.current.page).toBe(1)
    },
  )

  // robustness: scientific notation / hex / beyond-safe-integer must NOT slip
  // through to the query (Number('1e21') is a finite integer → would reach the API)
  it.each(['/?page=1e21', '/?page=0x10', '/?page=99999999999999999999', '/?page= 3'])(
    'falls back to page 1 for unsafe or non-decimal page param %s',
    (entry) => {
      const { result } = renderHook(() => usePagination(), { wrapper: wrapperWith([entry]) })
      expect(result.current.page).toBe(1)
    },
  )

  it.each(['/?limit=0x14', '/?limit=2e1'])(
    'falls back to limit 5 for non-decimal limit param %s',
    (entry) => {
      const { result } = renderHook(() => usePagination(), { wrapper: wrapperWith([entry]) })
      expect(result.current.limit).toBe(5)
    },
  )

  // limit must be one of the allowed options, else fall back to default 5
  it.each(['/?limit=7', '/?limit=0', '/?limit=abc', '/?limit=100'])(
    'falls back to limit 5 for invalid limit param %s',
    (entry) => {
      const { result } = renderHook(() => usePagination(), { wrapper: wrapperWith([entry]) })
      expect(result.current.limit).toBe(5)
    },
  )

  it('goToPage navigates to the given page and clamps below 1', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: wrapperWith(['/?page=2&limit=5']),
    })
    act(() => result.current.goToPage(4))
    expect(result.current.page).toBe(4)
    act(() => result.current.goToPage(0))
    expect(result.current.page).toBe(1)
  })

  it('setParams applies a merge-safe mutation: sets given keys, preserves the rest', async () => {
    function Probe() {
      const { setParams } = usePagination()
      const [params] = useSearchParams()
      return (
        <div>
          <span data-testid="page">{params.get('page') ?? ''}</span>
          <span data-testid="limit">{params.get('limit') ?? ''}</span>
          <span data-testid="status">{params.get('status') ?? ''}</span>
          <button
            onClick={() =>
              setParams((p) => {
                p.set('page', '1')
                p.set('status', 'approved')
              })
            }
          >
            apply
          </button>
        </div>
      )
    }
    render(
      <MemoryRouter initialEntries={['/?status=draft&page=2&limit=20']}>
        <Probe />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('apply'))
    expect(screen.getByTestId('page')).toHaveTextContent('1')
    expect(screen.getByTestId('status')).toHaveTextContent('approved')
    expect(screen.getByTestId('limit')).toHaveTextContent('20') // unrelated key preserved
  })

  it('setPage clamps values below 1 to 1', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: wrapperWith(['/?page=3&limit=5']),
    })
    act(() => result.current.setPage(-2))
    expect(result.current.page).toBe(1)
  })
})

// render usePagination + เก็บ committed location.search ทุกครั้งเพื่อ "นับ navigation"
// (location probe เช็คแค่ค่า URL แยก "ไม่ navigate" จาก "navigate ค่าเดิม" ไม่ได้)
function renderPagination(initialEntries: string[]) {
  const searches: string[] = []
  const apiRef: { current: ReturnType<typeof usePagination> | null } = { current: null }
  function Probe() {
    const api = usePagination()
    const loc = useLocation()
    // capture hook return in an effect (not during render) to satisfy react-hooks/immutability
    useEffect(() => {
      apiRef.current = api
    })
    useEffect(() => {
      searches.push(loc.search)
    }, [loc])
    return null
  }
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Probe />
    </MemoryRouter>,
  )
  return { searches, api: apiRef }
}

describe('usePagination — normalize (strip invalid params)', () => {
  it('strips an invalid limit from the URL and falls back to 5', async () => {
    const { searches, api } = renderPagination(['/?limit=7'])
    await waitFor(() => expect(searches.at(-1)).toBe(''))
    expect(api.current!.limit).toBe(5)
  })

  it('strips an invalid page (non-int / < 1) from the URL and falls back to 1', async () => {
    for (const entry of ['/?page=abc', '/?page=0', '/?page=2.5']) {
      const { searches, api } = renderPagination([entry])
      await waitFor(() => expect(searches.at(-1)).toBe(''))
      expect(api.current!.page).toBe(1)
    }
  })

  it('strips leading-zero / non-canonical params (?page=01, ?limit=05, ?limit=007)', async () => {
    const p = renderPagination(['/?page=01'])
    await waitFor(() => expect(p.searches.at(-1)).toBe(''))
    expect(p.api.current!.page).toBe(1)

    for (const entry of ['/?limit=05', '/?limit=007']) {
      const { searches, api } = renderPagination([entry])
      await waitFor(() => expect(searches.at(-1)).toBe(''))
      expect(api.current!.limit).toBe(5)
    }
  })

  it('strips whitespace-padded params (?page= 3)', async () => {
    const { searches } = renderPagination(['/?page= 3'])
    await waitFor(() => expect(searches.at(-1)).toBe(''))
  })

  it('does NOT navigate when params are valid (no spurious history entry)', async () => {
    const { searches, api } = renderPagination(['/?page=2&limit=20'])
    // ปล่อยให้ effect ที่อาจเกิดได้ flush ก่อน
    await Promise.resolve()
    expect(searches).toEqual(['?page=2&limit=20']) // mount เดียว ไม่มี navigation เพิ่ม
    expect(api.current!.page).toBe(2)
    expect(api.current!.limit).toBe(20)
  })

  it('strips only the invalid param, preserving valid + unrelated keys', async () => {
    const { searches } = renderPagination(['/?limit=7&status=draft&page=2'])
    await waitFor(() => {
      const last = new URLSearchParams(searches.at(-1))
      expect(last.has('limit')).toBe(false) // invalid → ลบ
      expect(last.get('status')).toBe('draft') // unrelated → คง
      expect(last.get('page')).toBe('2') // valid → คง
    })
  })

  it('strips both invalid page AND limit in a single navigation', async () => {
    const { searches } = renderPagination(['/?page=abc&limit=7&status=draft'])
    await waitFor(() => expect(new URLSearchParams(searches.at(-1)).get('status')).toBe('draft'))
    const last = new URLSearchParams(searches.at(-1))
    expect(last.has('page')).toBe(false)
    expect(last.has('limit')).toBe(false)
    expect(searches.length).toBe(2) // mount + 1 navigation (strip ทั้งคู่ใน write เดียว)
  })
})

function LocationPath() {
  const loc = useLocation()
  return <span data-testid="path">{loc.pathname}</span>
}
function BackButton() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>back</button>
}

describe('usePagination — history (push user-nav vs replace auto-correct)', () => {
  it('user navigation uses PUSH (back returns to the previous page)', async () => {
    function Probe() {
      const { page, nextPage } = usePagination()
      return (
        <div>
          <span data-testid="page">{page}</span>
          <button onClick={nextPage}>next</button>
        </div>
      )
    }
    render(
      <MemoryRouter initialEntries={['/?page=1']}>
        <Probe />
        <BackButton />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('next'))
    expect(screen.getByTestId('page')).toHaveTextContent('2')
    await userEvent.click(screen.getByText('back'))
    expect(screen.getByTestId('page')).toHaveTextContent('1') // push → back กลับ page 1
  })

  it('normalize uses REPLACE (the invalid URL is not left in history)', async () => {
    function Probe() {
      usePagination()
      return null
    }
    render(
      <MemoryRouter initialEntries={['/base', '/?limit=7']}>
        <Probe />
        <LocationPath />
        <BackButton />
      </MemoryRouter>,
    )
    // normalize strip → search ว่าง (pathname ยัง '/')
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'))
    await userEvent.click(screen.getByText('back'))
    // replace ทับ '/?limit=7' → back ไป '/base' (ถ้าเป็น push จะกลับไป '/' ของ ?limit=7)
    expect(screen.getByTestId('path')).toHaveTextContent('/base')
  })

  it('is idempotent under StrictMode (valid URL → no spurious navigation)', async () => {
    const searches: string[] = []
    function Probe() {
      usePagination()
      const loc = useLocation()
      useEffect(() => {
        searches.push(loc.search)
      }, [loc])
      return null
    }
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/?page=2&limit=20']}>
          <Probe />
        </MemoryRouter>
      </StrictMode>,
    )
    await Promise.resolve()
    // valid → ไม่ navigate; StrictMode double-invoke ของ collector effect อาจ push ค่าซ้ำ
    // แต่ค่าต้องเป็น '?page=2&limit=20' ทุกตัว (ไม่มี normalize เปลี่ยน URL)
    expect(new Set(searches)).toEqual(new Set(['?page=2&limit=20']))
  })
})

function renderClamp(initialEntries: string[], totalPages?: number) {
  const searches: string[] = []
  function Probe({ tp }: { tp?: number }) {
    useClampPageToTotal(tp)
    const loc = useLocation()
    useEffect(() => {
      searches.push(loc.search)
    }, [loc])
    return null
  }
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <Probe tp={totalPages} />
    </MemoryRouter>,
  )
  return { searches, utils, Probe }
}

describe('useClampPageToTotal', () => {
  it('clamps page down to totalPages when page exceeds it', async () => {
    const { searches } = renderClamp(['/?page=999'], 3)
    await waitFor(() => expect(searches.at(-1)).toBe('?page=3'))
  })

  it('does NOT navigate at the boundary page === totalPages', async () => {
    const { searches } = renderClamp(['/?page=3'], 3)
    await Promise.resolve()
    expect(searches).toEqual(['?page=3']) // no navigation → kill mutation `>` → `>=`
  })

  it('does NOT clamp while totalPages is unknown (loading)', async () => {
    const { searches } = renderClamp(['/?page=999'], undefined)
    await Promise.resolve()
    expect(searches).toEqual(['?page=999'])
  })

  it('does NOT navigate to page 0 when total is 0 (totalPages=0)', async () => {
    const { searches } = renderClamp(['/'], 0)
    await Promise.resolve()
    expect(searches).toEqual(['']) // kill mutation ลบ guard totalPages<1
  })

  it('re-clamps when totalPages shrinks below current page', async () => {
    const { searches, utils, Probe } = renderClamp(['/?page=3'], 5) // 3<=5 → no-op
    await Promise.resolve()
    utils.rerender(
      <MemoryRouter initialEntries={['/?page=3']}>
        <Probe tp={2} />
      </MemoryRouter>,
    )
    await waitFor(() => expect(searches.at(-1)).toBe('?page=2'))
  })

  it('clamp uses REPLACE (the over-range page is not left in history)', async () => {
    function Probe({ tp }: { tp?: number }) {
      useClampPageToTotal(tp)
      return null
    }
    render(
      <MemoryRouter initialEntries={['/base', '/?page=999']}>
        <Probe tp={3} />
        <LocationPath />
        <BackButton />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'))
    // clamp settle → ?page=3; back ต้องไป /base (replace ทับ ?page=999)
    await userEvent.click(screen.getByText('back'))
    expect(screen.getByTestId('path')).toHaveTextContent('/base')
  })
})

describe('integration — normalize + clamp compose (strip then clamp)', () => {
  it('strips invalid limit then clamps over-range page to the correct end state', async () => {
    const searches: string[] = []
    function Probe() {
      usePagination() // normalize (mount)
      useClampPageToTotal(3) // clamp (totalPages คงที่จำลอง data พร้อม)
      const loc = useLocation()
      useEffect(() => {
        searches.push(loc.search)
      }, [loc])
      return null
    }
    render(
      <MemoryRouter initialEntries={['/?limit=7&page=999&status=draft']}>
        <Probe />
      </MemoryRouter>,
    )
    await waitFor(() => {
      const last = new URLSearchParams(searches.at(-1))
      expect(last.has('limit')).toBe(false) // strip
      expect(last.get('page')).toBe('3') // clamp 999 → 3
      expect(last.get('status')).toBe('draft') // unrelated คง
    })
  })
})
