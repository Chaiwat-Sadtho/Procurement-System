import { PrStatus } from './entities/purchase-request.entity';
import { mapStatsRows } from './pr-stats.util';

describe('mapStatsRows', () => {
  it('maps raw rows to counts and derives total', () => {
    const result = mapStatsRows([
      { status: PrStatus.DRAFT, count: '2' },
      { status: PrStatus.SUBMITTED, count: '3' },
      { status: PrStatus.APPROVED, count: '5' },
      { status: PrStatus.REJECTED, count: '1' },
    ]);
    expect(result).toEqual({
      total: 11,
      draft: 2,
      submitted: 3,
      approved: 5,
      rejected: 1,
    });
  });

  it('defaults missing statuses to 0', () => {
    const result = mapStatsRows([{ status: PrStatus.SUBMITTED, count: '4' }]);
    expect(result).toEqual({
      total: 4,
      draft: 0,
      submitted: 4,
      approved: 0,
      rejected: 0,
    });
  });

  it('excludes under_review rows entirely (not counted, not in total)', () => {
    const result = mapStatsRows([
      { status: PrStatus.DRAFT, count: '1' },
      { status: PrStatus.UNDER_REVIEW, count: '9' },
      { status: PrStatus.APPROVED, count: '1' },
    ]);
    expect(result).toEqual({
      total: 2,
      draft: 1,
      submitted: 0,
      approved: 1,
      rejected: 0,
    });
  });

  it('converts string counts to numbers', () => {
    const result = mapStatsRows([{ status: PrStatus.DRAFT, count: '10' }]);
    expect(result.draft).toBe(10);
    expect(typeof result.draft).toBe('number');
  });

  it('returns all zeros for empty input', () => {
    expect(mapStatsRows([])).toEqual({
      total: 0,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    });
  });
});
