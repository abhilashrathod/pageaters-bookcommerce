import { subscriberSchema } from '../../commerce/subscriber.ts';
import { apiResponse, paginated } from '../../primitives.ts';

// GET /subscribers: newsletter subscribers, paged.
export const adminSubscriberListResponseSchema = apiResponse(paginated(subscriberSchema));
