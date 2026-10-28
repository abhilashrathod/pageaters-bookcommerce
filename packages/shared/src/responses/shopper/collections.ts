import { z } from 'zod';

import { collectionSchema } from '../../catalog/collection.ts';
import { apiResponse } from '../../primitives.ts';

// GET /collections/search/:q — lunr search, not paginated: whole documents, nothing populated.
export const shopperCollectionSearchResponseSchema = apiResponse(z.array(collectionSchema));
