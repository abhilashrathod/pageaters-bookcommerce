import { z } from 'zod';

import { imageUrlSchema } from '../primitives.ts';
import { linkSchema } from './common.ts';

// SEO meta subdocument (Category.meta). Mongoose creates the nested object with '' defaults, so every key is
// always sent. The seed sets `imageUrl` to the category thumbnail and clears `url` (it pointed at the old store;
// the storefront builds canonical URLs itself), so both may be ''. The category create/update endpoints still
// accept a whole `meta`, so a written `url` must be a safe link.
export const metaSchema = z.object({
  title: z.string(),
  description: z.string(),
  imageUrl: imageUrlSchema.or(z.literal('')),
  url: linkSchema.or(z.literal('')),
});
export type Meta = z.infer<typeof metaSchema>;
