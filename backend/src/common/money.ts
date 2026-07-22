import Decimal from 'decimal.js';

// Money math via decimal.js instead of float, to avoid precision errors (1.03 x 1.5 = 1.545 -> 1.55).
// Every helper returns a number already rounded to 2 decimals.

export function itemTotal(quantity: number | string, unitPrice: number | string): number {
  return new Decimal(quantity).times(unitPrice).toDecimalPlaces(2).toNumber();
}

export function sumMoney(values: Array<number | string>): number {
  return values
    .reduce((sum: Decimal, v) => sum.plus(v), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
}
