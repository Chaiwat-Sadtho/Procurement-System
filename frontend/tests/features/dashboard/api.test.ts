import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/axios', () => ({ default: { get: vi.fn() } }))
import api from '@/shared/lib/axios'
import { dashboardApi } from '@/features/dashboard/api'

describe('dashboardApi.getBudgets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('coerces numeric-string amounts (pg numeric) into real numbers', async () => {
    // pg numeric columns กลับมาเป็น string ผ่าน driver — boundary ต้อง coerce
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: 1,
          departmentId: 1,
          department: { id: 1, name: 'IT' },
          fiscalYear: 2026,
          quarter: null,
          totalAmount: '3000000.00',
          reservedAmount: '500000.00',
          usedAmount: '250000.00',
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

  it('collapses non-finite amounts to 0 (defense-in-depth: never display ฿NaN/฿∞)', async () => {
    // ถ้า backend คืนค่าเพี้ยน (overflow string / non-numeric) raw Number() จะได้ Infinity/NaN
    // → guard ที่ boundary ต้อง coerce เป็น 0 ไม่ให้หลุดไปคำนวณ/แสดงผล
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: 2,
          departmentId: 2,
          department: { id: 2, name: 'HR' },
          fiscalYear: 2026,
          quarter: null,
          totalAmount: '1e999',
          reservedAmount: 'abc',
          usedAmount: '',
        },
      ],
    } as never)

    const [b] = await dashboardApi.getBudgets({ fiscalYear: 2026 })

    expect(b.totalAmount).toBe(0) // Number('1e999') === Infinity → 0
    expect(b.reservedAmount).toBe(0) // Number('abc') === NaN → 0
    expect(b.usedAmount).toBe(0)
    // arithmetic ยังเป็นตัวเลขจริง ไม่ใช่ NaN
    expect(b.reservedAmount + b.usedAmount).toBe(0)
  })
})
