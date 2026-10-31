import { addOns } from './add-ons.ts';
import { addresses } from './addresses.ts';
import { auth } from './auth.ts';
import { authors } from './authors.ts';
import { books } from './books.ts';
import { bundles } from './bundles.ts';
import { cart } from './cart.ts';
import { categories } from './categories.ts';
import { collections } from './collections.ts';
import { deals } from './deals.ts';
import { favorites } from './favorites.ts';
import { mysteryBoxes } from './mystery-boxes.ts';
import { orders } from './orders.ts';
import { productSets } from './product-sets.ts';
import { stockAlerts } from './stock-alerts.ts';
import { outbox } from './outbox.ts';
import { storeCredit } from './store-credit.ts';
import { subscribers } from './subscribers.ts';

// Public and shopper resources, mounted at the client's top level (`client.categories.list()`).
//
// Non-admin routes deliberately left out (all six are on PLAN.md's Phase 4 list):
// - GET /                                 health ping, no API envelope
// - POST /public/contactUs                unauthenticated mail trigger; no frontend uses it (remove or guard)
// - GET /store-books/bulk/export          unauthenticated dev-only CSV dump written to local disk
// - POST /orders/create-shipment/:orderId an admin action guarded only as USER with no owner check; the admin client
//                                         covers it (`client.admin.orders.createShipment`)
// - POST /orders/confirm                  Razorpay webhook (server to server)
// - POST /orders/refund/processed         Razorpay webhook (server to server)
export const shopperEndpoints = {
  // Catalog (public reads)
  books,
  authors,
  categories,
  collections,
  bundles,
  productSets,
  deals,
  addOns,
  mysteryBoxes,
  // Shopper
  auth,
  cart,
  favorites,
  addresses,
  orders,
  outbox,
  storeCredit,
  stockAlerts,
  subscribers,
};
