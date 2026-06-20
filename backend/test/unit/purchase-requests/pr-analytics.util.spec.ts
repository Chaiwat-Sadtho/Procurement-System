import {
  buildMonthWindow,
  fillTrend,
  mapSpendRows,
} from '@app/purchase-requests/pr-analytics.util';

describe('buildMonthWindow', () => {
  it('returns N months ending at now, oldest first, as YYYY-MM', () => {
    expect(buildMonthWindow(new Date(2026, 5, 15), 12)).toEqual([
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
  });

  it('crosses year boundary correctly', () => {
    expect(buildMonthWindow(new Date(2026, 0, 1), 3)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
  });
});

describe('fillTrend', () => {
  it('zero-fills months with no rows and coerces string counts', () => {
    const window = ['2026-04', '2026-05', '2026-06'];
    const rows = [
      { month: '2026-04', count: '2' },
      { month: '2026-06', count: '5' },
    ];
    expect(fillTrend(window, rows)).toEqual([
      { month: '2026-04', count: 2 },
      { month: '2026-05', count: 0 },
      { month: '2026-06', count: 5 },
    ]);
  });

  it('ignores rows outside the window', () => {
    const window = ['2026-05', '2026-06'];
    const rows = [{ month: '2025-01', count: '9' }];
    expect(fillTrend(window, rows)).toEqual([
      { month: '2026-05', count: 0 },
      { month: '2026-06', count: 0 },
    ]);
  });
});

describe('mapSpendRows', () => {
  it('coerces numeric strings and sorts by total desc', () => {
    const rows = [
      { departmentId: '1', departmentName: 'IT', total: '1000.00' },
      { departmentId: 2, departmentName: 'Finance', total: '3000.00' },
    ];
    expect(mapSpendRows(rows)).toEqual([
      { departmentId: 2, departmentName: 'Finance', total: 3000 },
      { departmentId: 1, departmentName: 'IT', total: 1000 },
    ]);
  });

  it('returns empty array for no rows', () => {
    expect(mapSpendRows([])).toEqual([]);
  });
});
