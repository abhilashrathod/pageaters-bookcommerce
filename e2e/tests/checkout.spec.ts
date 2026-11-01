import { expect, test } from '@playwright/test';

// The demo's one happy path: browse → add to cart → checkout → order in admin → ship → delivered.
// Needs the API with DEMO_MODE=true (demo logins) and mock adapters, plus the storefront and admin pointed at it.
// Checkout pays cash on delivery: the Razorpay test window can't confirm locally (its webhook never reaches localhost).
const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:4200';
// The admin build calls http://localhost:5005; when the demo-mode API runs elsewhere, its calls are forwarded there.
const ADMIN_BUILT_API = 'http://localhost:5005';
const API_URL = process.env.E2E_API_URL ?? ADMIN_BUILT_API;

test('shopper orders a book, admin ships and delivers it', async ({ page }) => {
  // Browse: open the first book on the home page that can be added to the cart.
  await page.goto('/');
  const books = await page
    .locator('a[href^="/books/"]')
    .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href') ?? ''))]);
  expect(books.length).toBeGreaterThan(0);
  const addToCart = page.getByRole('button', { name: 'Add to Cart' });
  for (const href of books) {
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (await addToCart.isEnabled()) break;
  }

  // Add to cart (signs in as the demo shopper on the way).
  await addToCart.click();
  await page.getByRole('link', { name: 'Added — view cart' }).click();
  await expect(page).toHaveURL(/\/cart$/);

  // Checkout: the seeded address, then cash on delivery.
  await page.getByRole('link', { name: 'Proceed to Buy' }).click();
  await page.getByRole('button', { name: 'Use Selected Address' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByRole('radio', { name: 'Cash on Delivery' }).check();
  await page.getByRole('button', { name: 'Place Order' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible();
  const orderNo = (await page.getByText(/Your Order No:/).textContent())?.replace('Your Order No:', '').trim() ?? '';
  expect(orderNo).not.toBe('');

  // Admin: the order shows up in the list.
  if (API_URL !== ADMIN_BUILT_API) {
    await page.route(`${ADMIN_BUILT_API}/**`, async (route) => {
      const response = await route.fetch({ url: route.request().url().replace(ADMIN_BUILT_API, API_URL) });
      await route.fulfill({ response });
    });
  }
  await page.goto(ADMIN_URL);
  await page.getByRole('button', { name: 'Sign in as demo admin' }).click();
  await page.waitForURL(/\/admin/);
  await page.goto(`${ADMIN_URL}/admin/orders/list`);
  await page.getByRole('searchbox').fill(orderNo);
  const row = page.getByRole('row').filter({ hasText: orderNo });
  await expect(row).toBeVisible();
  await row.locator('[mattooltip="View"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(orderNo);

  // Ship, then mark as delivered.
  await page.getByLabel('Shipment ID').fill(`E2E${Date.now()}`);
  await page.getByRole('button', { name: 'Ship', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Shipped' })).toBeDisabled();
  await page.getByRole('button', { name: 'Mark As Delivered' }).click();
  await expect(page.getByRole('button', { name: 'Order Closed' })).toBeDisabled();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('(fulfilled)');
});
