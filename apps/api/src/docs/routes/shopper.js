const s = require('@pageaters/shared');

// The signed-in shopper's routes: cart, checkout and orders, addresses, favourites, store credit, stock alerts.

const v1 = (path) => `/api/v1${path}`;
const user = (tag) => (method, path, summary, rest) => ({ method, path: v1(path), tag, summary, auth: 'user', ...rest });

const cart = user('Cart');
const orders = user('Checkout & Orders');
const addresses = user('Addresses');
const favourites = user('Favourites');
const credit = user('Store credit');
const alerts = user('Stock alerts');
const outbox = user('Outbox');

const write = s.shopperCartWriteResponseSchema;
const empty = s.shopperEmptyResponseSchema;
const noBodySchema = 'The body has no shared schema yet (see the api-client’s cart endpoints).';
const cartId = (kind) => ({ id: `The ${kind}’s ObjectId.` });
const orderId = { uniqueId: 'The public `orderId`.' };
const product = { product: 'The book’s ObjectId.' };

module.exports = [
  cart('GET', '/cart/retrieve', 'Get my cart', {
    description: 'Populated, with current prices and `subTotal` recomputed. Refreshes the cart cookie.',
    response: s.cartResponseSchema,
  }),
  cart('POST', '/cart/add', 'Add a book', { request: s.cartItemAddPayloadSchema, response: write }),
  cart('POST', '/cart/add/bundle', 'Add a bundle', { description: noBodySchema, response: write }),
  cart('POST', '/cart/add/box', 'Add a mystery box', { description: noBodySchema, response: write }),
  cart('POST', '/cart/add/addOn', 'Add an add-on', { request: s.cartAddOnAddPayloadSchema, response: write }),
  cart('PUT', '/cart/update/:id', 'Change a book’s quantity', { params: cartId('book'), description: noBodySchema, response: write }),
  cart('PUT', '/cart/update/addOn/:id', 'Change an add-on’s quantity', {
    params: cartId('add-on'),
    description: noBodySchema,
    response: write,
  }),
  cart('DELETE', '/cart/remove/:id', 'Remove a book', { params: cartId('book'), response: write }),
  cart('DELETE', '/cart/remove/bundle/:bundleId', 'Remove a bundle', { response: write }),
  cart('DELETE', '/cart/remove/box/:boxId', 'Remove a mystery box', { response: write }),
  cart('DELETE', '/cart/remove/addOn/:addOnId', 'Remove an add-on', { response: write }),
  cart('DELETE', '/cart/empty', 'Empty my cart', { description: 'Removes every line.', response: write }),
  cart('DELETE', '/cart/clear', 'Forget my cart', { description: 'Clears the cart cookie.', response: empty }),

  orders('POST', '/orders/attempt', 'Start checkout', {
    description: 'Opens the pending order from the cart with the chosen address (a re-attempt takes it over).',
    request: s.orderAttemptPayloadSchema,
    response: empty,
  }),
  orders('GET', '/orders/retrieve', 'Get my open checkout', { response: s.shopperCheckoutOrderResponseSchema }),
  orders('PATCH', '/orders/credit', 'Apply store credit', { request: s.orderStoreCreditPayloadSchema, response: empty }),
  orders('POST', '/orders/create', 'Place the order', {
    description:
      'Prices the order server-side. Online payment answers the Razorpay order id that opens checkout; cash on ' +
      'delivery is confirmed at once.',
    request: s.orderCreatePayloadSchema,
    response: s.shopperOrderCreateResponseSchema,
  }),
  orders('GET', '/orders/list', 'List my orders', { response: s.customerOrderListResponseSchema }),
  orders('GET', '/orders/getByUniqueId/:uniqueId', 'Get my order', { params: orderId, response: s.customerOrderResponseSchema }),
  orders('POST', '/orders/return/:uniqueId', 'Request a return', { params: orderId, request: s.orderReturnPayloadSchema, response: empty }),
  orders('POST', '/orders/cancel/:uniqueId', 'Request a cancellation', {
    params: orderId,
    request: s.orderCancelPayloadSchema,
    response: empty,
  }),

  addresses('GET', '/addresses', 'List my addresses', { response: s.shopperAddressListResponseSchema }),
  addresses('GET', '/addresses/:id', 'Get an address', { request: s.addressGetPayloadSchema, response: s.shopperAddressResponseSchema }),
  addresses('POST', '/addresses', 'Add an address', {
    description: 'The PIN code must be serviceable (else 400 `PINCODE_ERROR`).',
    request: s.addressCreatePayloadSchema,
    response: s.shopperAddressResponseSchema,
  }),
  addresses('PUT', '/addresses/:id', 'Update an address', {
    description: 'Sets only the fields sent.',
    request: s.addressUpdatePayloadSchema,
    response: s.shopperAddressResponseSchema,
  }),
  addresses('PATCH', '/addresses/:id', 'Make an address the default', {
    request: s.addressGetPayloadSchema,
    response: s.shopperAddressResponseSchema,
  }),
  addresses('DELETE', '/addresses/:id', 'Delete an address', { request: s.addressGetPayloadSchema, response: empty }),
  {
    method: 'GET',
    path: v1('/addresses/check-pincode/:pincode'),
    tag: 'Addresses',
    summary: 'Check a PIN code',
    description: 'Asks the courier whether it delivers there; an unserviceable code is a 400 `PINCODE_ERROR`.',
    auth: 'public',
    limiter: 'pincodeCheck',
    request: s.addressPincodePayloadSchema,
    response: s.shopperPincodeServiceabilityResponseSchema,
  },

  favourites('GET', '/favorites', 'List my favourites', { response: s.favoritesListResponseSchema }),
  favourites('GET', '/favorites/:product', 'Is it a favourite?', {
    request: s.favoritesRequestPayloadSchema,
    response: s.shopperCheckResponseSchema,
  }),
  favourites('POST', '/favorites', 'Add a favourite', { request: s.favoritesRequestPayloadSchema, response: empty }),
  favourites('DELETE', '/favorites/:product', 'Remove a favourite', { request: s.favoritesRequestPayloadSchema, response: empty }),

  outbox('GET', '/outbox', 'My outbox', {
    auth: 'session',
    description:
      'DEMO_MODE only (404 otherwise). The demo’s in-app outbox: the newest 50 messages the mock e-mail and SMS adapters sent to the caller, newest first. An admin other than the demo admin sees everyone’s.',
    response: s.shopperOutboxResponseSchema,
  }),
  credit('GET', '/store-credit', 'My store credit balance', { response: s.shopperStoreCreditBalanceResponseSchema }),
  credit('GET', '/store-credit/history', 'My store credit history', {
    paged: 'page',
    response: s.shopperStoreCreditHistoryResponseSchema,
  }),

  alerts('GET', '/stock-alerts/:product', 'Am I subscribed?', { params: product, response: s.shopperCheckResponseSchema }),
  alerts('POST', '/stock-alerts', 'Subscribe to a back-in-stock alert', {
    description: 'The body (`{ product }`) has no shared schema yet.',
    response: s.shopperStockAlertResponseSchema,
  }),
  alerts('DELETE', '/stock-alerts/:product', 'Unsubscribe', { params: product, response: empty }),
];
