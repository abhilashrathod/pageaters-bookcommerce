import { z } from 'zod';

import { apiResponse } from '../../primitives.ts';

// POST /file/upload: `fileUrl` is the uploaded file's full Vercel Blob URL, stored as-is in catalog image fields.
export const adminFileUploadResultSchema = z.object({
  fileUrl: z.string().min(1),
});
export type AdminFileUploadResult = z.infer<typeof adminFileUploadResultSchema>;
export const adminFileUploadResponseSchema = apiResponse(adminFileUploadResultSchema);
