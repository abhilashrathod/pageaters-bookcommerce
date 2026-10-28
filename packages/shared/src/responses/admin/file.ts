import { z } from 'zod';

import { apiResponse } from '../../primitives.ts';

// POST /file/upload. The legacy API answers with the stored object's key (`slug-random-timestamp.ext`), not a URL,
// although the field is called `fileUrl`; the catalog contract's image fields need an https URL, so Phase 5
// (Vercel Blob) must answer with the blob URL.
export const adminFileUploadResultSchema = z.object({
  fileUrl: z.string().min(1),
});
export type AdminFileUploadResult = z.infer<typeof adminFileUploadResultSchema>;
export const adminFileUploadResponseSchema = apiResponse(adminFileUploadResultSchema);
