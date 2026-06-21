import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  FileText,
  PackageCheck,
  Building2,
  Wallet,
  Users,
  Megaphone,
  Settings,
} from 'lucide-react'
import type { Role } from '@/shared/types'

export interface NavLinkItem {
  kind: 'link'
  label: string
  path: string
  allowedRoles: Role[]
  icon: LucideIcon
}

export interface NavGroupItem {
  kind: 'group'
  label: string
  icon: LucideIcon
  children: NavLinkItem[]
}

export type NavEntry = NavLinkItem | NavGroupItem

const ALL_ROLES: Role[] = ['employee', 'manager', 'procurement_officer']
const STAFF_ROLES: Role[] = ['manager', 'procurement_officer']

export const SIDEBAR_GROUP_STORAGE_PREFIX = 'sidebar-group:'

export const navItems: NavEntry[] = [
  { kind: 'link', label: 'แดชบอร์ด', path: '/dashboard', allowedRoles: ALL_ROLES, icon: LayoutDashboard },
  {
    kind: 'group',
    label: 'จัดซื้อ',
    icon: ShoppingCart,
    children: [
      {
        kind: 'link',
        label: 'ใบขอซื้อ',
        path: '/purchase-requests',
        allowedRoles: ALL_ROLES,
        icon: ClipboardList,
      },
      {
        kind: 'link',
        label: 'ใบสั่งซื้อ',
        path: '/purchase-orders',
        allowedRoles: STAFF_ROLES,
        icon: FileText,
      },
      {
        kind: 'link',
        label: 'รับของ',
        path: '/goods-receipts',
        allowedRoles: STAFF_ROLES,
        icon: PackageCheck,
      },
    ],
  },
  { kind: 'link', label: 'ผู้ขาย', path: '/vendors', allowedRoles: STAFF_ROLES, icon: Building2 },
  { kind: 'link', label: 'งบประมาณ', path: '/budgets', allowedRoles: STAFF_ROLES, icon: Wallet },
  { kind: 'link', label: 'ผู้ใช้งาน', path: '/users', allowedRoles: ['procurement_officer'], icon: Users },
  { kind: 'link', label: 'ประกาศ', path: '/announcements', allowedRoles: ['procurement_officer'], icon: Megaphone },
  { kind: 'link', label: 'ตั้งค่า', path: '/settings', allowedRoles: ALL_ROLES, icon: Settings },
]
