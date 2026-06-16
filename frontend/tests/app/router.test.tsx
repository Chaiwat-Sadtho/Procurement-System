import { describe, it, expect } from 'vitest'
import { isValidElement, type ReactElement } from 'react'
import { router } from '@/app/router'
import { GRNListPage } from '@/features/goods-receipts/pages/GRNListPage'
import { GRNFormPage } from '@/features/goods-receipts/pages/GRNFormPage'
import { GRNDetailPage } from '@/features/goods-receipts/pages/GRNDetailPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { BudgetListPage } from '@/features/budgets/pages/BudgetListPage'
import { BudgetDetailPage } from '@/features/budgets/pages/BudgetDetailPage'
import { BudgetFormPage } from '@/features/budgets/pages/BudgetFormPage'

// router config is a plain object tree; the protected children live under route[1] ('/')
type RouteLike = { path?: string; element?: unknown; children?: RouteLike[] }

function findRoute(path: string): RouteLike | undefined {
  const root = (router.routes as unknown as RouteLike[]).find((r) => r.path === '/')
  return root?.children?.find((c) => c.path === path)
}

// the route element is <ProtectedRoute><Page/></ProtectedRoute>; dig out the inner page type
function innerPageType(element: unknown): unknown {
  if (!isValidElement(element)) return undefined
  const props = (element as ReactElement<{ children?: unknown }>).props
  const child = props.children
  return isValidElement(child) ? (child as ReactElement).type : undefined
}

describe('router — goods-receipts routes are wired (no more ComingSoon)', () => {
  it('goods-receipts → GRNListPage, guarded by manager + procurement_officer', () => {
    const route = findRoute('goods-receipts')!
    expect(innerPageType(route.element)).toBe(GRNListPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['manager', 'procurement_officer'])
  })

  it('goods-receipts/new → GRNFormPage, guarded by procurement_officer', () => {
    const route = findRoute('goods-receipts/new')!
    expect(innerPageType(route.element)).toBe(GRNFormPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['procurement_officer'])
  })

  it('goods-receipts/:id → GRNDetailPage, guarded by manager + procurement_officer', () => {
    const route = findRoute('goods-receipts/:id')!
    expect(innerPageType(route.element)).toBe(GRNDetailPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['manager', 'procurement_officer'])
  })
})

describe('router — users route is wired (no more ComingSoon)', () => {
  it('users → UsersPage, guarded by procurement_officer only', () => {
    const route = findRoute('users')!
    expect(innerPageType(route.element)).toBe(UsersPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['procurement_officer'])
  })
})

describe('router — budgets routes are wired (no more ComingSoon)', () => {
  it('budgets → BudgetListPage, guarded by manager + procurement_officer', () => {
    const route = findRoute('budgets')!
    expect(innerPageType(route.element)).toBe(BudgetListPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['manager', 'procurement_officer'])
  })

  it('budgets/new → BudgetFormPage, guarded by procurement_officer', () => {
    const route = findRoute('budgets/new')!
    expect(innerPageType(route.element)).toBe(BudgetFormPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['procurement_officer'])
  })

  it('budgets/:id → BudgetDetailPage, guarded by manager + procurement_officer', () => {
    const route = findRoute('budgets/:id')!
    expect(innerPageType(route.element)).toBe(BudgetDetailPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['manager', 'procurement_officer'])
  })

  it('budgets/:id/edit → BudgetFormPage, guarded by procurement_officer', () => {
    const route = findRoute('budgets/:id/edit')!
    expect(innerPageType(route.element)).toBe(BudgetFormPage)
    const guardProps = (route.element as ReactElement<{ allowedRoles?: string[] }>).props
    expect(guardProps.allowedRoles).toEqual(['procurement_officer'])
  })
})
