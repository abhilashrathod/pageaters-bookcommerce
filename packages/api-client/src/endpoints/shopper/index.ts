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
import { storeCredit } from './store-credit.ts';
import { subscribers } from './subscribers.ts';

// Public and shopper resources, mounted at the client's top level (`client.categories.list()`).
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
  storeCredit,
  stockAlerts,
  subscribers,
};
