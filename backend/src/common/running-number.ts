// รวม format ของ running number (PR/PO/GRN) ที่ซ้ำกัน 3 ที่ ให้เป็น single source
// รูปแบบ `${prefix}-${year}-${pad4(seq)}` เช่น PR-2025-0001 (suffix zero-padded อย่างน้อย 4 หลัก
// แต่ขยายเองเมื่อ seq > 9999 → PR-2025-10000 ไม่ตัด)
export function formatRunningNumber(
  prefix: 'PR' | 'PO' | 'GRN',
  year: number,
  seq: number,
): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

// L2: หา running number ถัดไปจากชุดเลขของปีเดียวกัน โดยหา MAX แบบ numeric
// แทน ORDER BY lexical + slice(-4) เดิม ที่พังถาวรเมื่อเลข > 9999
// (lexical: '10000' < '9999' → ได้เลขเก่า; slice(-4): '10000' → '0000' → gen ซ้ำ → 23505 loop).
// parse suffix หลัง '-' ตัวสุดท้ายเต็มความยาว (ไม่ fix 4 หลัก) + ข้าม token ที่ parse ไม่ได้.
export function nextRunningSeq(existingNumbers: string[]): number {
  const maxSeq = existingNumbers.reduce((max, n) => {
    const seq = Number(n.slice(n.lastIndexOf('-') + 1));
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return maxSeq + 1;
}
