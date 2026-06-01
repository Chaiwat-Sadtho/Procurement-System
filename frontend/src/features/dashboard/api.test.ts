import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/axios', () => ({ default: { get: vi.fn() } }))
import api from '@/shared/lib/axios'
import { dashboardApi } from './api'

describe('dashboardApi.getBudgets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('coerces numeric-string amounts (pg numeric) into real numbers', async () => {
    // pg numeric columns กลับมาเป็น string ผ่าน driver — boundary ต้อง coerce
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: 1, departmentId: 1, department: { id: 1, name: 'IT' }, fiscalYear: 2026, quarter: null,
          totalAmount: '3000000.00', reservedAmount: '500000.00', usedAmount: '250000.00',
        },
      ],
    } as never)

    const [b] = await dashboardApi.getBudgets({ fiscalYear: 2026 })

    expect(b.totalAmount).toBe(3000000)
    expect(b.reservedAmount).toBe(500000)
    expect(b.usedAmount).toBe(250000)
    // arithmetic ที่เคยพัง (string concat → NaN) ต้องได้ตัวเลขจริง
    expect(b.reservedAmount + b.usedAmount).toBe(750000)
  })
})
