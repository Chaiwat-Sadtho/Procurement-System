import { describe, it, expect } from 'vitest'
import { parseUserFilters, serializeUserFilters, usersUrlFilterConfig } from './usersUrlFilters'
import { DEFAULT_USER_FILTERS } from './userFilters'

describe('parseUserFilters', () => {
  it('returns defaults when no params are present', () => {
    expect(parseUserFilters(new URLSearchParams())).toEqual(DEFAULT_USER_FILTERS)
  })

  it('keeps a known role and falls back to all for an unknown one', () => {
    expect(parseUserFilters(new URLSearchParams('role=manager')).role).toBe('manager')
    expect(parseUserFilters(new URLSearchParams('role=procurement_officer')).role).toBe(
      'procurement_officer',
    )
    expect(parseUserFilters(new URLSearchParams('role=hacker')).role).toBe('all')
  })

  it('keeps active/inactive status and falls back to all otherwise', () => {
    expect(parseUserFilters(new URLSearchParams('status=active')).status).toBe('active')
    expect(parseUserFilters(new URLSearchParams('status=inactive')).status).toBe('inactive')
    expect(parseUserFilters(new URLSearchParams('status=xyz')).status).toBe('all')
  })

  it('reads search verbatim (no trim on parse)', () => {
    expect(parseUserFilters(new URLSearchParams('search=somchai')).search).toBe('somchai')
  })
})

describe('serializeUserFilters', () => {
  it('writes nothing for all-default values', () => {
    const p = new URLSearchParams()
    serializeUserFilters(DEFAULT_USER_FILTERS, p)
    expect(p.toString()).toBe('')
  })

  it('round-trips real values back through parse', () => {
    const p = new URLSearchParams()
    serializeUserFilters({ search: 'somchai', role: 'manager', status: 'active' }, p)
    expect(p.get('search')).toBe('somchai')
    expect(p.get('role')).toBe('manager')
    expect(p.get('status')).toBe('active')
    expect(parseUserFilters(p)).toEqual({ search: 'somchai', role: 'manager', status: 'active' })
  })

  it('trims search: whitespace-only drops the key, padded value is trimmed', () => {
    const empty = new URLSearchParams()
    serializeUserFilters({ search: '   ', role: 'all', status: 'all' }, empty)
    expect(empty.has('search')).toBe(false)

    const padded = new URLSearchParams()
    serializeUserFilters({ search: '  somchai  ', role: 'all', status: 'all' }, padded)
    expect(padded.get('search')).toBe('somchai')
  })

  it('deletes a key when its value reverts to default (idempotent set/delete)', () => {
    const p = new URLSearchParams('search=old&role=manager&status=active')
    serializeUserFilters(DEFAULT_USER_FILTERS, p)
    expect(p.toString()).toBe('')
  })
})

describe('usersUrlFilterConfig', () => {
  it('carries resetPage:false because the Users page is not paginated', () => {
    expect(usersUrlFilterConfig.resetPage).toBe(false)
  })
})
