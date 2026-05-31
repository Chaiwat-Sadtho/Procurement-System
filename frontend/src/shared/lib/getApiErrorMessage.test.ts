import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { getApiErrorMessage } from './getApiErrorMessage'

function axiosErr(data: unknown, status = 400) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data,
    status,
    statusText: '',
    headers: {},
    config: {} as never,
  } as never)
}

describe('getApiErrorMessage', () => {
  it('returns backend message string from an axios error', () => {
    expect(getApiErrorMessage(axiosErr({ message: 'Only submitted PRs can be approved' }))).toBe(
      'Only submitted PRs can be approved',
    )
  })

  it('returns the first item when backend message is an array', () => {
    expect(getApiErrorMessage(axiosErr({ message: ['reason should not be empty', 'x'] }))).toBe(
      'reason should not be empty',
    )
  })

  it('returns fallback for a non-axios error', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('เกิดข้อผิดพลาด')
  })

  it('returns custom fallback when there is no usable message', () => {
    expect(getApiErrorMessage(axiosErr({}), 'ลองใหม่อีกครั้ง')).toBe('ลองใหม่อีกครั้ง')
  })
})
