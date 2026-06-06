import type { Role } from '@/shared/types'

export interface NavLinkItem {
  kind: 'link'
  label: string
  path: string
  allowedRoles: Role[]
}

export interface NavGroupItem {
  kind: 'group'
  label: string
  children: NavLinkItem[]
}

export type NavEntry = NavLinkItem | NavGroupItem

const ALL_ROLES: Role[] = ['employee', 'manager', 'procurement_officer']
const STAFF_ROLES: Role[] = ['manager', 'procurement_officer']

export const SIDEBAR_GROUP_STORAGE_PREFIX = 'sidebar-group:'

export const navItems: NavEntry[] = [
  { kind: 'link', label: 'Dashboard', path: '/dashboard', allowedRoles: ALL_ROLES },
  {
    kind: 'group',
    label: 'จัดซื้อ',
    children: [
      {
        kind: 'link',
        label: 'Purchase Requests',
        path: '/purchase-requests',
        allowedRoles: ALL_ROLES,
      },
      {
        kind: 'link',
        label: 'Purchase Orders',
        path: '/purchase-orders',
        allowedRoles: STAFF_ROLES,
      },
      { kind: 'link', label: 'Goods Receipts', path: '/goods-receipts', allowedRoles: STAFF_ROLES },
    ],
  },
  { kind: 'link', label: 'Vendors', path: '/vendors', allowedRoles: STAFF_ROLES },
  { kind: 'link', label: 'Budgets', path: '/budgets', allowedRoles: STAFF_ROLES },
  { kind: 'link', label: 'Users', path: '/users', allowedRoles: ['procurement_officer'] },
  { kind: 'link', label: 'Settings', path: '/settings', allowedRoles: ALL_ROLES },
]
