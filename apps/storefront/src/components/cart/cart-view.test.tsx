// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { CartView } from './cart-view.tsx';

const api = vi.hoisted(() => ({
  detail: vi.fn(),
  updateQuantity: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/shopper-api.ts', () => ({
  shopperApi: { cart: api },
  errorMessage: (cause: unknown) => String(cause),
}));
vi.mock('@/lib/session.ts', () => ({ refreshCart: vi.fn(() => Promise.resolve()) }));
vi.mock('next/image', () => ({ default: () => null }));

// A synthetic cart: every total comes from the API, the view only shows it.
const book = { _id: 'p1', title: 'Test Book', poster: null, price: 400, currentDiscount: 0, author: { name: 'A. Writer' } };
const cart = (quantity: number) => ({
  products: [{ _id: 'l1', product: book, quantity, productTotal: 400 * quantity }],
  bundles: [],
  mysteryBoxes: [],
  addOns: [],
  subTotal: 400 * quantity,
});
const emptyCart = { products: [], bundles: [], mysteryBoxes: [], addOns: [], subTotal: 0 };

let container: HTMLDivElement;
let root: Root;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// Runs a UI step, then lets the mocked API promises and React updates settle.
const settle = (step: () => void) =>
  act(async () => {
    step();
    await Promise.resolve();
  });
const render = () => settle(() => root.render(<CartView />));
const text = () => container.textContent ?? '';

test('shows each line and the subtotal and grand total from the API', async () => {
  api.detail.mockResolvedValue(cart(2));
  await render();
  expect(text()).toContain('Test Book');
  expect(text()).toContain('Subtotal:₹800');
  expect(text()).toContain('Grand Total:₹800');
});

test('changing the quantity updates the line and reloads the totals', async () => {
  api.detail.mockResolvedValueOnce(cart(1)).mockResolvedValue(cart(2));
  api.updateQuantity.mockResolvedValue({});
  await render();
  expect(text()).toContain('Subtotal:₹400');

  const select = container.querySelector('select')!;
  await settle(() => {
    select.value = '2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(api.updateQuantity).toHaveBeenCalledWith({ product: 'p1', quantity: 2 });
  expect(text()).toContain('Subtotal:₹800');
});

test('deleting the last line removes it and shows the empty cart', async () => {
  api.detail.mockResolvedValueOnce(cart(1)).mockResolvedValue(emptyCart);
  api.remove.mockResolvedValue({});
  await render();

  const remove = [...container.querySelectorAll('button')].find((button) => button.textContent?.startsWith('Delete'))!;
  await settle(() => remove.click());
  expect(api.remove).toHaveBeenCalledWith({ product: 'p1' });
  expect(text()).toContain('Cart is Empty');
  expect(text()).not.toContain('Test Book');
});

test('an empty cart shows the empty state', async () => {
  api.detail.mockResolvedValue(emptyCart);
  await render();
  expect(text()).toContain('Cart is Empty');
  expect(container.querySelector('a[href="/"]')).not.toBeNull();
});
