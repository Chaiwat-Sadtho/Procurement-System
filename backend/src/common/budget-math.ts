// Pure budget arithmetic shared by BudgetsService and seed-demo; every helper returns the value to store (2dp, min 0).
export const round2 = (n: number): number => Number(n.toFixed(2));

// PR approved → reserve budget
export const applyReserve = (reserved: number, amount: number): number => round2(reserved + amount);

// PO cancelled → release the reservation
export const applyRelease = (reserved: number, amount: number): number =>
  round2(Math.max(0, reserved - amount));

// PO created → adjust the reservation by the PO/PR difference (delta < 0 = PO cheaper)
export const applyAdjust = (reserved: number, delta: number): number =>
  round2(Math.max(0, reserved + delta));

// GRN fully received → release the reservation and book it as used
export const applyConsume = (
  reserved: number,
  used: number,
  reservedToRelease: number,
  usedToAdd: number,
): { reserved: number; used: number } => ({
  reserved: round2(Math.max(0, reserved - reservedToRelease)),
  used: round2(used + usedToAdd),
});
