import { describe, it, expect } from 'vitest'
import {
  parseBudgetFilters,
  serializeBudgetFilters,
  budgetUrlFilterConfig,
  DEFAULT_BUDGET_FILTERS,
} from '@/features/budgets/lib/budgetUrlFilters'

const CURRENT_YEAR = new Date().getFullYear()

describe('parseBudgetFilters', () => {
  it('defaults to the current fiscal year and no department when no params', () => {
    expect(parseBudgetFilters(new URLSearchParams())).toEqual({ fiscalYear: CURRENT_YEAR })
  })

  it('keeps a valid fiscal year and falls back to the current year otherwise', () => {
    expect(parseBudgetFilters(new URLSearchParams('fiscalYear=2025')).fiscalYear).toBe(2025)
    expect(parseBudgetFilters(new URLSearchParams('fiscalYear=1999')).fiscalYear).toBe(CURRENT_YEAR) // out of range
    expect(parseBudgetFilters(new URLSearchParams('fiscalYear=abc')).fiscalYear).toBe(CURRENT_YEAR)
  })

  it('keeps a numeric departmentId and drops a non-numeric one', () => {
    expect(parseBudgetFilters(new URLSearchParams('departmentId=7')).departmentId).toBe(7)
    expect(parseBudgetFilters(new URLSearchParams('departmentId=abc')).departmentId).toBeUndefined()
  })
})

describe('serializeBudgetFilters', () => {
  it('writes nothing for the default (current year, no department)', () => {
    const p = new URLSearchParams()
    serializeBudgetFilters(DEFAULT_BUDGET_FILTERS, p)
    expect(p.toString()).toBe('')
  })

  it('omits fiscalYear at the current-year default but writes a non-default year', () => {
    const cur = new URLSearchParams()
    serializeBudgetFilters({ fiscalYear: CURRENT_YEAR }, cur)
    expect(cur.has('fiscalYear')).toBe(false)

    const past = new URLSearchParams()
    serializeBudgetFilters({ fiscalYear: 2025 }, past)
    expect(past.get('fiscalYear')).toBe('2025')
  })

  it('round-trips a year + department back through parse', () => {
    const p = new URLSearchParams()
    serializeBudgetFilters({ fiscalYear: 2025, departmentId: 7 }, p)
    expect(p.get('fiscalYear')).toBe('2025')
    expect(p.get('departmentId')).toBe('7')
    expect(parseBudgetFilters(p)).toEqual({ fiscalYear: 2025, departmentId: 7 })
  })

  it('deletes departmentId when undefined (idempotent set/delete)', () => {
    const p = new URLSearchParams('departmentId=7')
    serializeBudgetFilters({ fiscalYear: CURRENT_YEAR }, p)
    expect(p.has('departmentId')).toBe(false)
  })
})

describe('budgetUrlFilterConfig', () => {
  it('opts out of page reset (Budgets is not paginated)', () => {
    expect(budgetUrlFilterConfig.resetPage).toBe(false)
  })
})
