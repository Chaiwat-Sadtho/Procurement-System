import { formatRunningNumber, nextRunningSeq } from '@app/common/running-number';

describe('nextRunningSeq', () => {
  it('returns 1 when there are no existing numbers', () => {
    expect(nextRunningSeq([])).toBe(1);
  });
  it('returns the max suffix + 1 regardless of input order', () => {
    expect(nextRunningSeq(['PR-2026-0003', 'PR-2026-0001', 'PR-2026-0002'])).toBe(4);
  });
  it('does not truncate suffixes past 9999', () => {
    expect(nextRunningSeq(['PR-2026-9999'])).toBe(10000);
  });
  it('picks the numeric max, not the lexical max, above 9999', () => {
    // lexical DESC would pick '9999' (bug); numeric max is 10001 -> next 10002
    expect(nextRunningSeq(['PR-2026-9999', 'PR-2026-10000', 'PR-2026-10001'])).toBe(10002);
  });
  it('ignores malformed / non-numeric suffixes', () => {
    expect(nextRunningSeq(['PR-2026-0005', 'garbage'])).toBe(6);
  });
});

describe('formatRunningNumber', () => {
  it('pads the sequence to 4 digits', () => {
    expect(formatRunningNumber('PR', 2025, 1)).toBe('PR-2025-0001');
  });
  it('keeps 4-digit sequences as-is', () => {
    expect(formatRunningNumber('PO', 2026, 1234)).toBe('PO-2026-1234');
  });
  it('does not truncate sequences longer than 4 digits', () => {
    expect(formatRunningNumber('GRN', 2025, 12345)).toBe('GRN-2025-12345');
  });
  it('uses the given prefix and year', () => {
    expect(formatRunningNumber('GRN', 2099, 7)).toBe('GRN-2099-0007');
  });
});
