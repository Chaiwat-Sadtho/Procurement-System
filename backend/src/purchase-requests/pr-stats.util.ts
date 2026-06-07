import { PrStatus } from './entities/purchase-request.entity';

export interface PrStatsResponse {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
}

type CountedStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
const COUNTED: CountedStatus[] = ['draft', 'submitted', 'approved', 'rejected'];

// map raw GROUP BY rows → response. ตัด under_review (และ status อื่นที่ไม่อยู่ใน COUNTED) ทิ้ง.
// getRawMany คืน count เป็น string → แปลงเป็น number.
export function mapStatsRows(rows: { status: PrStatus; count: string }[]): PrStatsResponse {
  const counts: Record<CountedStatus, number> = {
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of rows) {
    if ((COUNTED as string[]).includes(row.status)) {
      counts[row.status as CountedStatus] = Number(row.count);
    }
  }
  const total = COUNTED.reduce((sum, key) => sum + counts[key], 0);
  return { total, ...counts };
}
