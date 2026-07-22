// Single source for the PR/PO/GRN running-number format: PR-2025-0001 (padded to 4, grows past 9999)
export function formatRunningNumber(
  prefix: 'PR' | 'PO' | 'GRN',
  year: number,
  seq: number,
): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

// Next sequence for a year: numeric MAX (lexical sort breaks past 9999); unparsable numbers are skipped
export function nextRunningSeq(existingNumbers: string[]): number {
  const maxSeq = existingNumbers.reduce((max, n) => {
    const seq = Number(n.slice(n.lastIndexOf('-') + 1));
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return maxSeq + 1;
}
