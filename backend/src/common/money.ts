import Decimal from 'decimal.js';

// คำนวณเงินด้วย decimal.js แทน float เพื่อกัน precision error (เช่น 1.03 × 1.5 = 1.545 → 1.55)
// คืนค่าเป็น number ที่ปัดเป็น 2 ตำแหน่งแล้ว (ค่า 2 ตำแหน่งทศนิยมอยู่ในช่วง safe integer ของ JS)

export function itemTotal(quantity: number | string, unitPrice: number | string): number {
  return new Decimal(quantity).times(unitPrice).toDecimalPlaces(2).toNumber();
}

export function sumMoney(values: Array<number | string>): number {
  return values
    .reduce((sum: Decimal, v) => sum.plus(v), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
}
