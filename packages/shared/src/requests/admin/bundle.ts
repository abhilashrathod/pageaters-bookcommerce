import { z } from 'zod';

import { bundleFieldsSchema } from '../../catalog/bundle.ts';
import { adminOptionalIdListSchema } from './common.ts';

// POST /bundles and PUT /bundles/:id (bundle.controller.js). Types first (see common.ts). Reference lists may be left
// out (common.ts).
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
  bundledBooks: adminOptionalIdListSchema,
  categories: adminOptionalIdListSchema,
  relatedBundles: adminOptionalIdListSchema,
  relatedCollections: adminOptionalIdListSchema,
};

// The image is required on create, as every catalog document has one (https, `imageUrlSchema`). Until Phase 4/5
// the legacy upload answers with a stored key, not a URL, so a form fed by it fails this check.
export const adminBundleCreatePayloadSchema = bundlePayloadFields.partial().extend({
  title: bundleFieldsSchema.shape.title,
  poster: bundleFieldsSchema.shape.poster,
  ...bundleRelations,
});
export type AdminBundleCreatePayload = z.infer<typeof adminBundleCreatePayloadSchema>;

// The update `$set`s every field it reads, so the scalar fields are required; the reference lists may be left out.
// It does not read `weight` (legacy: a bundle's weight can't be changed after creation, Phase 4).
export const adminBundleUpdatePayloadSchema = bundlePayloadFields.omit({ weight: true }).required().extend(bundleRelations);
export type AdminBundleUpdatePayload = z.infer<typeof adminBundleUpdatePayloadSchema>;

// What the API enforces on POST and PUT: every reference is an id (see common.ts).
export const adminBundleReferencesPayloadSchema = z.object(bundleRelations);
export type AdminBundleReferencesPayload = z.infer<typeof adminBundleReferencesPayloadSchema>;
