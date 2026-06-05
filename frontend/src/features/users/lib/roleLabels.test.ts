import { describe, it, expect } from 'vitest'
import { ROLE_LABELS, ROLE_OPTIONS } from './roleLabels'
import type { Role } from '@/shared/types'

describe('roleLabels', () => {
  it('maps all three roles to Thai labels', () => {
    expect(ROLE_LABELS.employee).toBe('พนักงาน')
    expect(ROLE_LABELS.manager).toBe('ผู้จัดการ')
    expect(ROLE_LABELS.procurement_officer).toBe('เจ้าหน้าที่จัดซื้อ')
  })

  it('ROLE_OPTIONS lists exactly the three roles with matching labels', () => {
    expect(ROLE_OPTIONS).toHaveLength(3)
    const values = ROLE_OPTIONS.map((o) => o.value)
    expect(values).toEqual(['employee', 'manager', 'procurement_officer'])
    ROLE_OPTIONS.forEach((o) => {
      expect(o.label).toBe(ROLE_LABELS[o.value as Role])
    })
  })
})
