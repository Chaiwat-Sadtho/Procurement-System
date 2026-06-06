// รวม format ของ running number (PR/PO/GRN) ที่ซ้ำกัน 3 ที่ ให้เป็น single source
// รูปแบบ `${prefix}-${year}-${pad4(seq)}` เช่น PR-2025-0001 (suffix zero-padded 4 หลัก)
export function formatRunningNumber(
  prefix: 'PR' | 'PO' | 'GRN',
  year: number,
  seq: number,
): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}
