export interface TrendPoint {
  month: string; // 'YYYY-MM'
  count: number;
}

export interface SpendPoint {
  departmentId: number;
  departmentName: string;
  total: number;
}

// 'YYYY-MM' labels for the last `months` months ending at `now` (inclusive), oldest first.
export function buildMonthWindow(now: Date, months = 12): string[] {
  const out: string[] = [];
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1); // JS Date normalizes month underflow across years
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    out.push(`${d.getFullYear()}-${mm}`);
  }
  return out;
}

// Merge grouped rows onto the full month skeleton; missing month -> 0; count string -> number.
export function fillTrend(
  window: string[],
  rows: { month: string; count: string }[],
): TrendPoint[] {
  const counts = new Map(rows.map((r) => [r.month, Number(r.count)]));
  return window.map((month) => ({ month, count: counts.get(month) ?? 0 }));
}

// Coerce pg numeric (string) -> number and sort desc (deterministic regardless of query order).
export function mapSpendRows(
  rows: { departmentId: number | string; departmentName: string; total: string }[],
): SpendPoint[] {
  return rows
    .map((r) => ({
      departmentId: Number(r.departmentId),
      departmentName: r.departmentName,
      total: Number(r.total),
    }))
    .sort((a, b) => b.total - a.total);
}
