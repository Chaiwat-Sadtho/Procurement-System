import { describe, expect, it } from 'vitest'
import {
  createBudgetSchema,
  makeEditBudgetSchema,
  toCreatePayload,
  toUpdatePayload,
  budgetToFormValues,
  createDefaultValues,
  QUARTER_ANNUAL,
} from '@/features/budgets/lib/budgetFormSchema'
import type { BudgetSummary } from '@/features/budgets/types'

describe('budgetFormSchema', () => {
  const validCreate = {
    departmentId: 3,
    fiscalYear: 2026,
    quarter: QUARTER_ANNUAL,
    totalAmount: '1000000',
  }

  it('accepts a valid create payload', () => {
    expect(createBudgetSchema.safeParse(validCreate).success).toBe(true)
  })

  it('rejects departmentId 0 (not chosen)', () => {
    expect(createBudgetSchema.safeParse({ ...validCreate, departmentId: 0 }).success).toBe(false)
  })

  it('rejects totalAmount below 1', () => {
    expect(createBudgetSchema.safeParse({ ...validCreate, totalAmount: '0' }).success).toBe(false)
  })

  it('rejects fiscalYear out of 2020-2100', () => {
    expect(createBudgetSchema.safeParse({ ...validCreate, fiscalYear: 1999 }).success).toBe(false)
  })

  it('maps annual create payload (quarter null)', () => {
    expect(toCreatePayload(validCreate)).toEqual({
      departmentId: 3,
      fiscalYear: 2026,
      quarter: null,
      totalAmount: 1000000,
    })
  })

  it('maps a quarterly create payload (quarter number)', () => {
    expect(toCreatePayload({ ...validCreate, quarter: '2' }).quarter).toBe(2)
  })

  it('edit schema rejects totalAmount below committed', () => {
    const schema = makeEditBudgetSchema(500000)
    expect(schema.safeParse({ ...validCreate, totalAmount: '400000' }).success).toBe(false)
    expect(schema.safeParse({ ...validCreate, totalAmount: '500000' }).success).toBe(true)
  })

  it('toUpdatePayload only carries totalAmount', () => {
    expect(toUpdatePayload(validCreate)).toEqual({ totalAmount: 1000000 })
  })

  it('budgetToFormValues maps a quarterly budget back to a string quarter', () => {
    const summary = {
      id: 1,
      departmentId: 3,
      fiscalYear: 2026,
      quarter: 2,
      totalAmount: 1000000,
    } as BudgetSummary
    expect(budgetToFormValues(summary)).toMatchObject({ quarter: '2', totalAmount: '1000000' })
  })

  it('createDefaultValues defaults to annual + empty amount', () => {
    expect(createDefaultValues()).toMatchObject({ quarter: QUARTER_ANNUAL, totalAmount: '' })
  })
})
