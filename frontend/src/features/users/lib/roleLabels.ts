import type { Role } from '@/shared/types'

/** Role -> Thai label. Single source of truth (spec §7 D6). */
export const ROLE_LABELS: Record<Role, string> = {
  employee: 'พนักงาน',
  manager: 'ผู้จัดการ',
  procurement_officer: 'เจ้าหน้าที่จัดซื้อ',
}

/** Options for the inline role Select (all three roles; filter prepends 'all' itself). */
export const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'employee', label: ROLE_LABELS.employee },
  { value: 'manager', label: ROLE_LABELS.manager },
  { value: 'procurement_officer', label: ROLE_LABELS.procurement_officer },
]
