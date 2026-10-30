import { z } from 'zod';

import { collectionSchema } from '../../catalog/collection.ts';
import { apiResponse } from '../../primitives.ts';

// GET /collections/search/:q — word-prefix search, at most 10 (most popular first), not paginated: whole documents, nothing populated.
export const shopperCollectionSearchResponseSchema = apiResponse(z.array(collectionSchema));
