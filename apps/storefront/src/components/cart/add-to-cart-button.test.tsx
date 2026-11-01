// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { AddToCartButton } from './add-to-cart-button.tsx';

const mocks = vi.hoisted(() => ({ add: vi.fn(() => Promise.resolve({})), refreshCart: vi.fn(() => Promise.resolve()) }));

vi.mock('@/lib/shopper-api.ts', () => ({ shopperApi: { cart: { add: mocks.add } }, errorMessage: String }));
vi.mock('@/lib/session.ts', () => ({
  useSession: () => ({ status: 'shopper' }),
  demoLogin: vi.fn(),
  refreshCart: mocks.refreshCart,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test('adds one copy of the book and links to the cart', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<AddToCartButton kind="book" id="p1" />));

  await act(async () => {
    container.querySelector('button')!.click();
    await Promise.resolve();
  });
  expect(mocks.add).toHaveBeenCalledWith({ product: 'p1', quantity: 1 });
  expect(mocks.refreshCart).toHaveBeenCalledOnce();
  expect(container.querySelector('a[href="/cart"]')?.textContent).toContain('view cart');
  act(() => root.unmount());
});
