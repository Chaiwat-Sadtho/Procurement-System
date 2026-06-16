import { formatRunningNumber } from '@app/common/running-number';

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
