import { z } from 'zod';

// MongoDB ObjectId as it arrives over JSON: 24 hex characters (the API's Joi `objectId` accepts either case).
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'INVALID_ID');
export type ObjectId = z.infer<typeof objectIdSchema>;

// Mongoose `timestamps` (createdAt, updatedAt) serialise to ISO 8601 strings in JSON. The schema keeps them as
// strings so a parsed response stays JSON-serialisable (RSC props, Angular signals); convert with `new Date()`
// where a Date is needed. Legacy free-form date strings (`orderDate`, `deletedAt: ''`) are not this type.
export const isoDateSchema = z.iso.datetime({ offset: true });
export type IsoDate = z.infer<typeof isoDateSchema>;

// Amounts in Indian rupees, as the API stores them: a plain `Number`, never negative. Most prices are whole
// rupees, but derived prices (members' and rental prices) can carry paise, e.g. 599.25, so up to two decimals.
export const hasAtMostTwoDecimals = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
export const moneySchema = z.number().nonnegative().refine(hasAtMostTwoDecimals, 'INVALID_AMOUNT');
export type Money = z.infer<typeof moneySchema>;

// Image fields hold full https URLs (Vercel Blob since Phase 2). Fields that may be empty ('' is the model
// default) opt in with `imageUrlSchema.or(z.literal(''))` where they are defined.
export const imageUrlSchema = z.url({ protocol: /^https$/, hostname: z.regexes.domain });
export type ImageUrl = z.infer<typeof imageUrlSchema>;

// Query strings send '' for unset filters (the admin sends every key); treat it as missing so defaults apply.
const emptyAsMissing = (value: unknown) => (value === '' ? undefined : value);

const SORT_DIRECTIONS: Record<string, 1 | -1> = {
  '1': 1,
  asc: 1,
  ascending: 1,
  '-1': -1,
  desc: -1,
  descending: -1,
};

// Mongoose accepts 1/-1 and 'asc'/'desc'; the frontends send both (`sortOrder: -1`, `sortOrder=asc`).
// Normalised to 1 | -1 so a controller never has to guess (the category list used `Number('asc')` → NaN).
export const sortOrderSchema = z.preprocess(
  (value) => SORT_DIRECTIONS[String(emptyAsMissing(value))] ?? emptyAsMissing(value),
  z.literal([1, -1]).default(-1),
);
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const DEFAULT_PAGE_LIMIT = 10;
// The legacy frontends ask for up to 1000 rows at once (admin pickers, sitemap); keep that ceiling.
export const MAX_PAGE_LIMIT = 1000;

// List endpoints' query. Values arrive as strings and are coerced. An endpoint that restricts sorting replaces
// `sortBy` with its own enum: `paginationQuerySchema.extend({ sortBy: z.enum([...]).default('createdAt') })`.
export const paginationQuerySchema = z.object({
  page: z.preprocess(emptyAsMissing, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(emptyAsMissing, z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT)),
  sortBy: z.preprocess(emptyAsMissing, z.string().trim().min(1).max(50).default('createdAt')),
  sortOrder: sortOrderSchema,
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationQueryInput = z.input<typeof paginationQuerySchema>;

// mongoose-paginate-v2 (1.7.x) page envelope, without custom labels. paginate-v2 also sends `offset` when a
// request asked for one or for no page at all. Since Phase 4 every list asks for a page (never an offset), so `page`
// is always set.
const count = z.number().int().nonnegative();
export const paginationMetaSchema = z.object({
  totalDocs: count,
  limit: count,
  totalPages: count,
  page: z.number().int().min(1),
  offset: count.optional(),
  pagingCounter: count,
  hasPrevPage: z.boolean(),
  hasNextPage: z.boolean(),
  prevPage: z.number().int().min(1).nullable(),
  nextPage: z.number().int().min(1).nullable(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export function paginated<Item extends z.ZodType>(item: Item) {
  return paginationMetaSchema.extend({ docs: z.array(item) });
}
// Generic, so written out rather than inferred; `primitives.test.ts` checks it matches `paginated()`.
export type Paginated<Item> = PaginationMeta & { docs: Item[] };

// The API's success wrapper (`res.ok` / `res.created` in extendReq.middleware). `status` is the message key
// (e.g. 'BOOK_LIST_SUCCESS'); `res.created` leaves it out. `message` is that key translated.
const responseBase = z.object({
  statusCode: z.number().int(),
  status: z.string().optional(),
  message: z.string(),
});

export function apiResponse<Data extends z.ZodType>(data: Data) {
  return responseBase.extend({ data });
}
// Generic, so written out rather than inferred; `primitives.test.ts` checks it matches `apiResponse()`.
export type ApiResponse<Data> = z.infer<typeof responseBase> & { data: Data };

// The API's error wrapper (`res.error`, `res.unauthorized`, `res.forbidden`, `res.internalServerError`).
export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  status: z.string(),
  message: z.string(),
  error: z.string(),
  data: z.unknown(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
