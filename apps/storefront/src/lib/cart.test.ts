import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cartItemCount } from './cart.ts';

const line = (quantity: number) => ({ quantity }) as never;

void test('counts every line quantity', () => {
  assert.equal(cartItemCount({ products: [line(2), line(1)], bundles: [line(1)], addOns: [line(3)], mysteryBoxes: [line(1)] }), 8);
});

void test('an empty cart counts zero', () => {
  assert.equal(cartItemCount({ products: [], bundles: [], addOns: [], mysteryBoxes: [] }), 0);
});
