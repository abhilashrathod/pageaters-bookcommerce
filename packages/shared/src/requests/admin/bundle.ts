import type { z } from 'zod';

import { bundleFieldsSchema } from '../../catalog/bundle.ts';
import { adminIdListSchema } from './common.ts';

// POST /bundles and PUT /bundles/:id (bundle.controller.js). Types first (see common.ts). `bundledBooks` is iterated
// by both controllers (a missing list is a 500 today), so it is always required.
const bundlePayloadFields = bundleFieldsSchema.pick({
  title: true,
  description: true,
  tags: true,
  poster: true,
  popularity: true,
  priority: true,
  currentDiscount: true,
  weight: true,
  price: true,
  membersPrice: true,
});

const bundleRelations = {
  bundledBooks: adminIdListSchema,
  categories: adminIdListSchema,
  relatedBundles: adminIdListSchema,
  relatedCollections: adminIdListSchema,
};

export const adminBundleCreatePayloadSchema = bundlePayloadFields.partial().extend({
  title: bundleFieldsSchema.shape.title,
  bundledBooks: bundleRelations.bundledBooks,
  categories: bundleRelations.categories.optional(),
  relatedBundles: bundleRelations.relatedBundles.optional(),
  relatedCollections: bundleRelations.relatedCollections.optional(),
});
export type AdminBundleCreatePayload = z.infer<typeof adminBundleCreatePayloadSchema>;

// The update `$set`s every field it reads; an omitted one is written as null, so all are required. It does not read
// `weight` (legacy: a bundle's weight can't be changed after creation, Phase 4).
export const adminBundleUpdatePayloadSchema = bundlePayloadFields.omit({ weight: true }).extend(bundleRelations);
export type AdminBundleUpdatePayload = z.infer<typeof adminBundleUpdatePayloadSchema>;
