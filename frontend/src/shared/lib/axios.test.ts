import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { isUnauthorizedRedirect } from './axios'

function axiosErr(status: number, url: string) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', { url } as never, undefined, {
    status,
    statusText: '',
    headers: {},
    config: {} as never,
    data: {},
  } as never)
}

describe('isUnauthorizedRedirect', () => {
  it('returns true for a 401 from a normal (authenticated) request — session expired', () => {
    expect(isUnauthorizedRedirect(axiosErr(401, '/purchase-requests'))).toBe(true)
  })

  it('returns false for a 401 from the login request — bad credentials handled inline', () => {
    expect(isUnauthorizedRedirect(axiosErr(401, '/auth/login'))).toBe(false)
  })

  it('returns false for non-401 errors', () => {
    expect(isUnauthorizedRedirect(axiosErr(500, '/purchase-requests'))).toBe(false)
  })

  it('returns false for a non-axios error', () => {
    expect(isUnauthorizedRedirect(new Error('boom'))).toBe(false)
  })
})
