import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { ratingErrorMessage } from './ratingErrorMessage'

function axiosErr(message: string) {
  const err = new AxiosError('req failed')
  err.response = {
    data: { message },
    status: 400,
    statusText: '',
    headers: {},
    config: {} as never,
  }
  return err
}

describe('ratingErrorMessage', () => {
  it('maps the already-rated (409) backend message to Thai', () => {
    expect(ratingErrorMessage(axiosErr('This Purchase Order has already been rated'))).toBe(
      'ใบสั่งซื้อนี้ให้คะแนนไปแล้ว',
    )
  })

  it('maps the not-completed (400) backend message to Thai', () => {
    expect(ratingErrorMessage(axiosErr('Can only rate completed Purchase Orders'))).toBe(
      'ให้คะแนนได้เฉพาะใบสั่งซื้อที่รับของครบแล้ว',
    )
  })

  it('falls back for unknown errors', () => {
    expect(ratingErrorMessage(new Error('boom'))).toBe('บันทึกคะแนนไม่สำเร็จ')
  })
})
