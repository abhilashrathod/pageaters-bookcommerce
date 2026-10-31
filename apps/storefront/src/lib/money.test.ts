import assert from 'node:assert/strict';
import { test } from 'node:test';

import { discountedPrice, formatPrice } from './money.ts';

void test('discounts like the API cart: floor of price minus the percentage', () => {
  assert.equal(discountedPrice(399, 15), 339);
  assert.equal(discountedPrice(399), 399);
});

void test('formats rupees without paise', () => {
  assert.equal(formatPrice(1299), '₹1,299');
});
