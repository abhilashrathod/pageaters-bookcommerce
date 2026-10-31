const s = require('@pageaters/shared');

// Admin catalog reads and writes (ADMIN session). Bodies are the full shared payload contracts the admin sends; the
// route's validate() checks each write's references (`…ReferencesPayloadSchema`). `:id` is the ObjectId. In DEMO_MODE
// every write here (and the upload) refuses the demo admin with 400 DEMO_ADMIN_READ_ONLY.

const DEMO_READ_ONLY = 'Refused for the demo admin in DEMO_MODE (400 DEMO_ADMIN_READ_ONLY).';

const v1 = (path) => `/api/v1${path}`;
const admin = (method, path, summary, rest) => ({ method, path: v1(path), tag: 'Admin: Catalog', summary, auth: 'admin', ...rest });
const objectId = (kind) => ({ id: `The ${kind}’s ObjectId.` });

/**
 * The four routes of an admin catalog entity: read one, create, update, delete.
 * @param {string} base The mount path (`/authors`).
 * @param {string} kind Singular, for summaries (`author`).
 * @param {{ create: object, update: object, response: object, detailPath?: string, createStatus?: number }} schemas
 */
const crud = (base, kind, { create, update, response, detailPath = '/:id', createStatus }) => [
  admin('GET', `${base}${detailPath}`, `Get a ${kind} (admin)`, { params: objectId(kind), response }),
  admin('POST', base, `Create a ${kind}`, { description: DEMO_READ_ONLY, body: create, response, ...(createStatus && { status: createStatus }) }),
  admin('PUT', `${base}/:id`, `Update a ${kind}`, { description: DEMO_READ_ONLY, params: objectId(kind), body: update, response }),
  admin('DELETE', `${base}/:id`, `Delete a ${kind}`, {
    description: `Soft delete. ${DEMO_READ_ONLY}`,
    params: objectId(kind),
    response: s.adminEmptyResponseSchema,
  }),
];

module.exports = [
  ...crud('/store-books', 'book', {
    detailPath: '/get/:id',
    create: s.adminBookCreatePayloadSchema,
    update: s.adminBookUpdatePayloadSchema,
    response: s.bookDetailResponseSchema,
  }),
  ...crud('/authors', 'author', {
    create: s.adminAuthorCreatePayloadSchema,
    update: s.adminAuthorUpdatePayloadSchema,
    response: s.authorDetailResponseSchema,
  }),
  ...crud('/categories', 'category', {
    create: s.adminCategoryCreatePayloadSchema,
    update: s.adminCategoryUpdatePayloadSchema,
    response: s.categoryDetailResponseSchema,
    createStatus: 201,
  }),
  ...crud('/collections', 'collection', {
    create: s.adminCollectionCreatePayloadSchema,
    update: s.adminCollectionUpdatePayloadSchema,
    response: s.collectionDetailResponseSchema,
  }),
  ...crud('/bundles', 'bundle', {
    create: s.adminBundleCreatePayloadSchema,
    update: s.adminBundleUpdatePayloadSchema,
    response: s.bundleDetailResponseSchema,
  }),
  ...crud('/deals', 'deal', {
    create: s.adminDealCreatePayloadSchema,
    update: s.adminDealUpdatePayloadSchema,
    response: s.dealDetailResponseSchema,
  }),
  ...crud('/mystery-boxes', 'mystery box', {
    create: s.adminMysteryBoxCreatePayloadSchema,
    update: s.adminMysteryBoxUpdatePayloadSchema,
    response: s.mysteryBoxDetailResponseSchema,
  }),

  ...crud('/product-sets', 'product set', {
    create: s.adminProductSetCreatePayloadSchema,
    update: s.adminProductSetUpdatePayloadSchema,
    response: s.adminProductSetResponseSchema,
  }),

  admin('GET', '/add-ons', 'List add-ons', { query: s.adminAddOnListQuerySchema, response: s.addOnListResponseSchema }),
  ...crud('/add-ons', 'add-on', {
    create: s.adminAddOnCreatePayloadSchema,
    update: s.adminAddOnUpdatePayloadSchema,
    response: s.adminAddOnResponseSchema,
  }),

  {
    method: 'POST',
    path: v1('/file/upload'),
    tag: 'Admin: Files',
    summary: 'Upload an image',
    description: `A multipart form: one jpg or png in \`file\`, plus its folder and title. Answers the stored file’s URL. ${DEMO_READ_ONLY}`,
    auth: 'admin',
    multipart: s.adminFileUploadFieldsSchema,
    response: s.adminFileUploadResponseSchema,
  },
];
