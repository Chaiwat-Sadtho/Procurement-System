// เลขคณิตงบประมาณล้วน (pure) — ดึงออกจาก BudgetsService ให้ seed-demo คำนวณค่าที่เก็บลง DB ตรงกับ service เป๊ะ
// ทุกฟังก์ชันคืน "ค่าที่จะ store" (ปัด 2 ตำแหน่ง + clamp ไม่ติดลบ) — ดู reference_budget_arithmetic_refactor
export const round2 = (n: number): number => Number(n.toFixed(2));

// PR approved → จองงบ (reserved += amount)
export const applyReserve = (reserved: number, amount: number): number => round2(reserved + amount);

// PO cancelled → คืนงบจอง (reserved -= amount, ไม่ต่ำกว่า 0)
export const applyRelease = (reserved: number, amount: number): number =>
  round2(Math.max(0, reserved - amount));

// PO created → ปรับ reserved ตามส่วนต่างยอด PO จริง (delta = PO.total - PR.est; <0 = PO ถูกกว่า)
export const applyAdjust = (reserved: number, delta: number): number =>
  round2(Math.max(0, reserved + delta));

// GRN รับครบ → PO completed (reserved -= reservedToRelease, used += usedToAdd)
export const applyConsume = (
  reserved: number,
  used: number,
  reservedToRelease: number,
  usedToAdd: number,
): { reserved: number; used: number } => ({
  reserved: round2(Math.max(0, reserved - reservedToRelease)),
  used: round2(used + usedToAdd),
});
