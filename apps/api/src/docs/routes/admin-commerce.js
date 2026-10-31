const s = require('@pageaters/shared');

// Admin order lifecycle and customer views (ADMIN session).

const v1 = (path) => `/api/v1${path}`;
const role = (tag) => (method, path, summary, rest) => ({ method, path: v1(path), tag, summary, auth: 'admin', ...rest });
const orders = role('Admin: Orders');
const customers = role('Admin: Customers');

const orderObjectId = { id: 'The order’s ObjectId.' };
const requestIds = { id: 'The order’s ObjectId.', requestId: 'The return or replacement request’s id.' };
const product = { product: 'The book’s ObjectId.' };

module.exports = [
  orders('GET', '/orders', 'List orders', {
    description: 'Placed orders only (not attempted or created), customer, address and lines populated.',
    query: s.adminOrderListQuerySchema,
    response: s.adminOrderListResponseSchema,
  }),
  orders('GET', '/orders/search', 'Search orders by id', { query: s.adminSearchQuerySchema, response: s.adminOrderSearchResponseSchema }),
  orders('GET', '/orders/getById/:id', 'Get an order (admin)', { params: orderObjectId, response: s.adminOrderResponseSchema }),
  orders('POST', '/orders/create-shipment/:orderId', 'Book the courier', {
    description: 'Creates the forward shipment with the courier (the mock courier on the demo).',
    params: { orderId: 'The order’s ObjectId.' },
    request: s.adminShipmentCreateRequestSchema,
    response: s.adminShipmentCreateResponseSchema,
  }),
  orders('POST', '/orders/ship', 'Mark shipped', {
    request: s.adminOrderShipPayloadSchema,
    response: s.adminOrderWithCustomerResponseSchema,
  }),
  orders('PATCH', '/orders/ship/:id/complete', 'Mark delivered', {
    params: orderObjectId,
    response: s.adminOrderWithCustomerResponseSchema,
  }),
  orders('PATCH', '/orders/return/:id/shipment/:requestId', 'Schedule a return pickup', {
    params: requestIds,
    request: s.adminReturnShipmentRequestSchema,
    response: s.adminEmptyResponseSchema,
  }),
  orders('PATCH', '/orders/return/:id/shipment/:requestId/close', 'Close a return', {
    params: requestIds,
    response: s.adminEmptyResponseSchema,
  }),
  orders('PATCH', '/orders/replace/:id/shipment/:requestId/close', 'Close a replacement', {
    params: requestIds,
    response: s.adminEmptyResponseSchema,
  }),
  orders('POST', '/orders/admin-cancel/:id', 'Cancel an order', {
    params: orderObjectId,
    request: s.adminOrderCancelPayloadSchema,
    response: s.adminEmptyResponseSchema,
  }),
  orders('GET', '/orders/analytics/best-selling', 'Best-selling books', {
    description: 'The ten books sold most in the range, by quantity.',
    request: s.adminOrderAnalyticsQuerySchema,
    response: s.adminBestSellingResponseSchema,
  }),
  orders('GET', '/orders/analytics/revenue', 'Revenue', {
    description: 'The sum of fulfilled orders’ totals in the range.',
    request: s.adminOrderAnalyticsQuerySchema,
    response: s.adminRevenueResponseSchema,
  }),

  customers('GET', '/users', 'List customers', { paged: 'page', response: s.adminUserListResponseSchema }),
  customers('GET', '/users/search', 'Search users by e-mail', {
    query: s.adminSearchQuerySchema,
    response: s.adminUserSearchResponseSchema,
  }),
  customers('GET', '/users/:id', 'Get a customer', {
    description: 'The customer with their cart, address book and order history.',
    params: { id: 'The user’s ObjectId.' },
    response: s.adminUserDetailsResponseSchema,
  }),
  customers('GET', '/cart', 'List carts', { paged: 'page', response: s.adminCartListResponseSchema }),
  customers('GET', '/cart/:id', 'Get a cart', { params: { id: 'The cart’s ObjectId.' }, response: s.adminCartResponseSchema }),
  customers('GET', '/subscribers', 'List newsletter subscribers', { paged: 'page', response: s.adminSubscriberListResponseSchema }),
  customers('POST', '/store-credit', 'Issue store credit', {
    description: 'Refused for the demo admin in DEMO_MODE (400 DEMO_ADMIN_READ_ONLY).',
    status: 201,
    request: s.adminStoreCreditIssuePayloadSchema,
    response: s.adminEmptyResponseSchema,
  }),
  customers('GET', '/stock-alerts', 'List stock alerts', {
    description: 'Open alerts grouped per book.',
    paged: 'page',
    response: s.adminStockAlertListResponseSchema,
  }),
  customers('GET', '/stock-alerts/:product/users', 'A book’s alert subscribers', {
    params: product,
    response: s.adminStockAlertSubscribersResponseSchema,
  }),
  customers('POST', '/stock-alerts/:product/users', 'Notify subscribers', {
    description: 'E-mails every subscriber that the book is back and closes their alerts.',
    params: product,
    response: s.adminStockAlertNotifyResponseSchema,
  }),
];
