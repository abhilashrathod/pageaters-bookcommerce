import { z } from 'zod';

import { categoryProductSchema } from '../../catalog/book.ts';
import { categorySchema } from '../../catalog/category.ts';
import { apiResponse } from '../../primitives.ts';

// GET /categories/search/:q — word-prefix search, at most 10 (most books first), not paginated: its `select` projection.
export const shopperCategorySearchResultSchema = categorySchema.pick({
  _id: true,
  categoryId: true,
  title: true,
  numberOfBooks: true,
});
export type ShopperCategorySearchResult = z.infer<typeof shopperCategorySearchResultSchema>;
export const shopperCategorySearchResponseSchema = apiResponse(z.array(shopperCategorySearchResultSchema));

// GET /categories/:id/overview — the `docs` of three pages of the category's in-stock books (the category
// listing's projection), sorted by popularity, publication year and discount.
const categoryProducts = z.array(categoryProductSchema);
export const shopperCategoryOverviewSchema = z.object({
  trending: categoryProducts,
  newArrivals: categoryProducts,
  mostDiscounted: categoryProducts,
});
export type ShopperCategoryOverview = z.infer<typeof shopperCategoryOverviewSchema>;
export const shopperCategoryOverviewResponseSchema = apiResponse(shopperCategoryOverviewSchema);
