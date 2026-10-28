import { z } from 'zod';

// POST /file/upload (file.controller.js `uploadBucket`): a multipart form, not JSON. Types first (see common.ts).
//
// Fields: `fileModule` picks the storage folder, `title` names the file (kebab-cased, plus a random suffix), and the
// file itself goes in `file` (multer takes the first file of any name today). Extensions: jpg, jpeg, png.

// The API's FILE_MODULES (an unknown value falls back to the books folder).
export const AdminFileModule = {
  DEFAULT: 'DEFAULT',
  STORE_BOOK: 'STORE_BOOK',
  AUTHOR: 'AUTHOR',
  COLLECTION: 'COLLECTION',
  ASSETS: 'ASSETS',
  CATEGORY: 'CATEGORY',
  BUNDLE: 'BUNDLE',
} as const;
export const adminFileModuleSchema = z.enum(AdminFileModule);
export type AdminFileModule = z.infer<typeof adminFileModuleSchema>;

// The text fields of the form.
export const adminFileUploadFieldsSchema = z.object({
  fileModule: adminFileModuleSchema,
  title: z.string().trim().min(1).max(100),
});
export type AdminFileUploadFields = z.infer<typeof adminFileUploadFieldsSchema>;
