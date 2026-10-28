import { z } from 'zod';

import { bookSchema } from '../../catalog/book.ts';
import { apiResponse } from '../../primitives.ts';

// GET /store-books/search?q= — lunr search, at most 10 books, not paginated: its `select` projection with
// `author` populated (`name` only). An empty `q` answers [].
export const shopperBookSearchResultSchema = bookSchema.pick({
  _id: true,
  title: true,
  ISBN: true,
  bookId: true,
  author: true,
  poster: true,
  weight: true,
  price: true,
  popularity: true,
  inventory: true,
  editorsPick: true,
  newRelease: true,
  preOrder: true,
  currentDiscount: true,
  bestSeller: true,
});
export type ShopperBookSearchResult = z.infer<typeof shopperBookSearchResultSchema>;
export const shopperBookSearchResponseSchema = apiResponse(z.array(shopperBookSearchResultSchema));
