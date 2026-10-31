import { z } from 'zod';

import { apiResponse, isoDateSchema, objectIdSchema } from '../../primitives.ts';

// One message the mock e-mail or SMS adapter "sent" (apps/api/src/models/outbox.model.js): the demo's in-app outbox.
// `body` is the e-mail's HTML or the text's words; `subject` is set for e-mails only.
export const outboxMessageSchema = z.object({
  _id: objectIdSchema,
  channel: z.enum(['email', 'sms']),
  to: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  createdAt: isoDateSchema,
});
export type OutboxMessage = z.infer<typeof outboxMessageSchema>;

// GET /outbox (DEMO_MODE only): the newest 50 messages to the caller (an admin other than the demo admin: to anyone), newest first.
export const shopperOutboxResponseSchema = apiResponse(z.array(outboxMessageSchema));
