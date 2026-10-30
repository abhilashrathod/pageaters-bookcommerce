import { z } from 'zod';

import { authorSchema } from '../../catalog/author.ts';
import { apiResponse } from '../../primitives.ts';

// GET /authors/search?q= — word-prefix search, at most 10 (most popular first), not paginated: whole documents, books as ids.
export const shopperAuthorSearchResponseSchema = apiResponse(z.array(authorSchema));
