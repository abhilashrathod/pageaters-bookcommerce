import { adminFileUploadResponseSchema } from '@pageaters/shared';
import type { AdminFileModule, AdminFileUploadResult } from '@pageaters/shared';

import type { RequestSpec } from '../../core/http.ts';

// POST /file/upload (`file.routes.js`, multer): a multipart form, so it is not a `defineEndpoint`. A bound endpoint
// always sends its non-path fields as a JSON object, which would turn a FormData into `{}`. Until the core can bind
// a FormData body, the upload goes through the client's escape hatch with this spec, which `request` passes through
// untouched (no JSON content type; fetch sets the multipart boundary):
//
//   await client.request(fileUploadRequest(fileUploadForm({ file, fileName: 'cover.jpg', title, fileModule })));
//
// The legacy API answers with the stored object's key in `fileUrl`, not a URL (see `adminFileUploadResultSchema`).

export interface FileUploadInput {
  // Any Blob (a browser File, or a Blob in Node/Next).
  file: Blob;
  // Its name; the API takes the extension from it (jpg, jpeg or png).
  fileName: string;
  // Names the stored file (kebab-cased, plus a random suffix).
  title: string;
  // Picks the storage folder.
  fileModule: AdminFileModule;
}

// The API compares the extension case-sensitively with jpg/jpeg/png, so `COVER.JPG` would be rejected: lower-case it.
function lowerCaseExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? fileName : fileName.slice(0, dot) + fileName.slice(dot).toLowerCase();
}

// The form as the API reads it: `file`, `title`, `fileModule`.
export function fileUploadForm({ file, fileName, title, fileModule }: FileUploadInput): FormData {
  const form = new FormData();
  form.append('file', file, lowerCaseExtension(fileName));
  form.append('title', title);
  form.append('fileModule', fileModule);
  return form;
}

export function fileUploadRequest(form: FormData): RequestSpec<AdminFileUploadResult> {
  return { method: 'POST', path: '/file/upload', body: form, response: adminFileUploadResponseSchema.shape.data };
}
