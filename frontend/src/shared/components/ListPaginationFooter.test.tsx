import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListPaginationFooter } from './ListPaginationFooter'

const baseProps = {
  page: 1,
  totalPages: 3,
  limit: 10,
  onPrev: () => {},
  onNext: () => {},
  onLimitChange: () => {},
}

describe('ListPaginationFooter', () => {
  it('announces the page summary via a status region', () => {
    render(<ListPaginationFooter {...baseProps} summary="หน้า 2 จาก 5 (50 รายการ)" />)
    expect(screen.getByRole('status')).toHaveTextContent('หน้า 2 จาก 5 (50 รายการ)')
  })

  it('disables prev on the first page and next on the last page', () => {
    const { rerender } = render(
      <ListPaginationFooter {...baseProps} summary="" page={1} totalPages={3} />,
    )
    expect(screen.getByRole('button', { name: 'ก่อนหน้า' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeEnabled()

    rerender(<ListPaginationFooter {...baseProps} summary="" page={3} totalPages={3} />)
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeDisabled()
  })

  it('hides prev/next when there is only one page but keeps the summary live region', () => {
    render(
      <ListPaginationFooter
        {...baseProps}
        summary="หน้า 1 จาก 1 (3 รายการ)"
        page={1}
        totalPages={1}
      />,
    )
    expect(screen.queryByRole('button', { name: 'ก่อนหน้า' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('uses custom prev/next labels (e.g. English)', () => {
    render(
      <ListPaginationFooter
        {...baseProps}
        summary="Page 1 of 2 (2 total)"
        page={1}
        totalPages={2}
        prevLabel="Previous"
        nextLabel="Next"
      />,
    )
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('emits navigation callbacks on prev/next click', async () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    render(
      <ListPaginationFooter {...baseProps} summary="" page={2} totalPages={3} onPrev={onPrev} onNext={onNext} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'ก่อนหน้า' }))
    await userEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(onPrev).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('wires onLimitChange (as a number) to the page-size selector', async () => {
    const onLimitChange = vi.fn()
    render(<ListPaginationFooter {...baseProps} summary="" onLimitChange={onLimitChange} />)
    await userEvent.click(screen.getByLabelText('จำนวนแถวต่อหน้า'))
    await userEvent.click(await screen.findByRole('option', { name: '20' }))
    expect(onLimitChange).toHaveBeenCalledWith(20)
  })
})
