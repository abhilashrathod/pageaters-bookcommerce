import { z } from 'zod';
import { emailFieldSchema } from './common.ts';

// Newsletter sign-up (POST /subscriber), ported from apps/api/src/validators/subscriber.validator.js.
export const subscriberRootPayloadSchema = z.strictObject({
  email: emailFieldSchema,
});
export type SubscriberRootPayload = z.infer<typeof subscriberRootPayloadSchema>;
