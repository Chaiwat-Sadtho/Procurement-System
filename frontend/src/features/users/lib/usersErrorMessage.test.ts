import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { usersErrorMessage } from './usersErrorMessage'

function axiosErr(message: string): AxiosError {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    { status: 400, data: { message }, statusText: '', headers: {}, config: {} as never },
  )
}

describe('usersErrorMessage', () => {
  it('maps last-active-PO backend message to Thai', () => {
    expect(usersErrorMessage(axiosErr('Cannot remove the last active procurement officer'))).toBe(
      'ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน',
    )
  })

  it('passes through other recognised backend messages', () => {
    expect(usersErrorMessage(axiosErr('Cannot change your own role'))).toBe('Cannot change your own role')
  })

  it('falls back to a Thai generic message for unknown errors', () => {
    expect(usersErrorMessage(new Error('boom'))).toBe('ทำรายการไม่สำเร็จ')
  })
})
