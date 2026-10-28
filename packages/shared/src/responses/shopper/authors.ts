import { z } from 'zod';

import { authorSchema } from '../../catalog/author.ts';
import { apiResponse } from '../../primitives.ts';

// GET /authors/search?q= — lunr search, not paginated: whole documents, books as ids.
export const shopperAuthorSearchResponseSchema = apiResponse(z.array(authorSchema));
