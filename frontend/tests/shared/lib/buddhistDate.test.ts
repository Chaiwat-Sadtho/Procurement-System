import { describe, it, expect } from 'vitest'
import {
  isoToBuddhistText,
  buddhistTextToIso,
  maskBuddhistDate,
  dateToIso,
  isoToDate,
} from '@/shared/lib/buddhistDate'

describe('isoToBuddhistText', () => {
  it('แปลง ISO ค.ศ. → DD/MM/YYYY พ.ศ. (+543)', () => {
    expect(isoToBuddhistText('2026-01-01')).toBe('01/01/2569')
    expect(isoToBuddhistText('2026-12-31')).toBe('31/12/2569')
  })
  it('input ว่าง/ผิดรูปแบบ → ว่าง', () => {
    expect(isoToBuddhistText('')).toBe('')
    expect(isoToBuddhistText('2026-1-1')).toBe('')
  })
})

describe('maskBuddhistDate', () => {
  it('ใส่ slash อัตโนมัติ', () => {
    expect(maskBuddhistDate('01')).toBe('01')
    expect(maskBuddhistDate('0101')).toBe('01/01')
    expect(maskBuddhistDate('01012569')).toBe('01/01/2569')
  })
  it('ตัดอักขระไม่ใช่ตัวเลข + จำกัดปี 4 หลัก (รวม 8 หลัก)', () => {
    expect(maskBuddhistDate('01/01/2569')).toBe('01/01/2569')
    expect(maskBuddhistDate('0101256999')).toBe('01/01/2569')
  })
})

describe('buddhistTextToIso', () => {
  it('แปลง พ.ศ. ครบ → ISO ค.ศ.', () => {
    expect(buddhistTextToIso('01/01/2569')).toBe('2026-01-01')
    expect(buddhistTextToIso('31/12/2569')).toBe('2026-12-31')
  })
  it('ไม่ครบ/ปีไม่ 4 หลัก → ว่าง', () => {
    expect(buddhistTextToIso('01/01/25')).toBe('')
    expect(buddhistTextToIso('1/1/2569')).toBe('')
  })
  it('วัน/เดือนเกินจริง → ว่าง (เช่น 31/02, 32/01)', () => {
    expect(buddhistTextToIso('31/02/2569')).toBe('')
    expect(buddhistTextToIso('32/01/2569')).toBe('')
    expect(buddhistTextToIso('01/13/2569')).toBe('')
  })
})

describe('dateToIso / isoToDate (no timezone shift)', () => {
  it('dateToIso จาก local Date → YYYY-MM-DD ตรงวัน', () => {
    expect(dateToIso(new Date(2026, 11, 15))).toBe('2026-12-15')
    expect(dateToIso(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
  it('isoToDate คืน Date ที่ตรง Y/M/D', () => {
    const d = isoToDate('2026-12-15')!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 15])
    expect(isoToDate('')).toBeUndefined()
  })
})
