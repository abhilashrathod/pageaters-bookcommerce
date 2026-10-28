import { z } from 'zod';

import { imageUrlSchema } from '../primitives.ts';

// SEO meta subdocument (Category.meta). Mongoose creates the nested object with '' defaults, so every key is
// always sent. The seed sets `imageUrl` to the category thumbnail and clears `url` (it pointed at the old store;
// the storefront builds canonical URLs itself), so both may be ''.
export const metaSchema = z.object({
  title: z.string(),
  description: z.string(),
  imageUrl: imageUrlSchema.or(z.literal('')),
  url: z.string(),
});
export type Meta = z.infer<typeof metaSchema>;
