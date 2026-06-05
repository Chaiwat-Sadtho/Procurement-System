import { round2, applyReserve, applyRelease, applyAdjust, applyConsume } from './budget-math';

describe('budget-math', () => {
  describe('round2', () => {
    it('rounds float noise to 2 decimals', () => {
      expect(round2(0.1 + 0.2)).toBe(0.3); // 0.30000000000000004 → 0.3
      expect(round2(99.999)).toBe(100);
    });
  });
  describe('applyReserve', () => {
    it('adds the amount and rounds', () => {
      expect(applyReserve(0, 200000)).toBe(200000);
      expect(applyReserve(100.1, 0.2)).toBe(100.3);
    });
  });
  describe('applyRelease', () => {
    it('subtracts the amount', () => {
      expect(applyRelease(200000, 200000)).toBe(0);
    });
    it('clamps to 0 when releasing more than reserved', () => {
      expect(applyRelease(50000, 200000)).toBe(0);
    });
  });
  describe('applyAdjust', () => {
    it('applies a positive delta', () => {
      expect(applyAdjust(1200, 300)).toBe(1500);
    });
    it('applies a negative delta', () => {
      expect(applyAdjust(1200, -200)).toBe(1000);
    });
    it('clamps to 0', () => {
      expect(applyAdjust(100, -500)).toBe(0);
    });
  });
  describe('applyConsume', () => {
    it('releases reserved and adds used', () => {
      expect(applyConsume(300000, 100000, 300000, 280000)).toEqual({ reserved: 0, used: 380000 });
    });
    it('clamps reserved to 0', () => {
      expect(applyConsume(100, 0, 500, 500)).toEqual({ reserved: 0, used: 500 });
    });
  });
});
