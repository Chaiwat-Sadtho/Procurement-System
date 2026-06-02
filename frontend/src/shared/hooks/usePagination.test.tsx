import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook, act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { usePagination, PAGE_SIZE_OPTIONS } from './usePagination'

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
})
