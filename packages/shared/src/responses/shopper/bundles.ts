import { z } from 'zod';

import { bundleSchema } from '../../catalog/bundle.ts';
import { apiResponse } from '../../primitives.ts';

// GET /bundles/search/:q — word-prefix search, at most 10 (most popular first), not paginated: whole documents, nothing populated.
export const shopperBundleSearchResponseSchema = apiResponse(z.array(bundleSchema));
