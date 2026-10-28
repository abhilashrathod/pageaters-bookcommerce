import { addOns } from './add-ons.ts';
import { authors } from './authors.ts';
import { bundles } from './bundles.ts';
import { carts } from './carts.ts';
import { categories } from './categories.ts';
import { collections } from './collections.ts';
import { deals } from './deals.ts';
import { mysteryBoxes } from './mystery-boxes.ts';
import { orders } from './orders.ts';
import { productSets } from './product-sets.ts';
import { stockAlerts } from './stock-alerts.ts';
import { storeBooks } from './store-books.ts';
import { storeCredit } from './store-credit.ts';
import { subscribers } from './subscribers.ts';
import { users } from './users.ts';

export { fileUploadForm, fileUploadRequest } from './files.ts';
export type { FileUploadInput } from './files.ts';

// Admin-only resources (routes behind `permissionValidator(USER_ROLES.ADMIN)`), mounted under `client.admin`
// (`client.admin.orders.ship()`). The file upload is multipart and goes through `client.request` (see files.ts).
export const adminEndpoints = {
  addOns,
  authors,
  bundles,
  carts,
  categories,
  collections,
  deals,
  mysteryBoxes,
  orders,
  productSets,
  stockAlerts,
  storeBooks,
  storeCredit,
  subscribers,
  users,
};
