import { z } from 'zod';

import { isoDateSchema, objectIdSchema } from '../primitives.ts';

// A newsletter subscriber (apps/api/src/models/subscribers.model.js), as the admin's subscriber list pages them.
export const subscriberSchema = z.object({
  _id: objectIdSchema,
  email: z.email(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type Subscriber = z.infer<typeof subscriberSchema>;
