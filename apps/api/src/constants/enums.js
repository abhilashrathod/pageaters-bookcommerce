module.exports = {
  SOURCES: {
    POSTMAN: 'POSTMAN',
    WEB: 'WEB',
    ANDROID: 'ANDROID',
    IOS: 'IOS',
  },
  USER_STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BLOCKED: 'BLOCKED',
  },
  USER_ROLES: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
  FILE_MODULES: {
    DEFAULT: 'DEFAULT',
    STORE_BOOK: 'STORE_BOOK',
    AUTHOR: 'AUTHOR',
    COLLECTION: 'COLLECTION',
    CATEGORY: 'CATEGORY',
    BUNDLE: 'BUNDLE',
  },
  BUCKETS: {
    AUTHOR: 'pageaters-authors',
    COLLECTIONS: 'pageaters-collections',
    CATEGORIES: 'pageaters-categories',
    BUNDLES: 'pageaters-bundles',
    BOOK: 'storebooks'
  },
  VALID_FILE_TYPES: {
    JPG: 'jpg',
    PNG: 'png',
    JPEG: 'jpeg',
  },
  NOTIFICATION_TYPES: {
    MISCELLANEOUS: 'MISCELLANEOUS',
  },
  ADDRESS_TYPES: {
    HOME: 'HOME',
    OFFICE: 'OFFICE',
  },
  DISCOUNT_TYPES: {
     CUSTOMER: 'customer',
     CART: 'cart',
     RENT: 'rent',
     PURCHASE: 'purchase',
     BUNDLE: 'bundle',
     TRIAL: 'trial',
     SHIPPING: 'shipping',
     AFFILIATE: 'affiliate',
     REFERRAL: 'referral',
  },
  BOOK_VERSIONS: {
    HARDCOVER: 'hardcover',
    PAPERBACK: 'paperback',
    MASS_MARKET: 'mass_market',
  },
  NOTIFICATION_STATUS: {
    WAITING_FOR_DELIVERY: 'WAITING_FOR_DELIVERY',
    DELIVERED: 'DELIVERED',
    FAILED: 'FAILED',
  },
  PAYMENT_STAGES: {
    CREATED: 'created',
    AUTHORIZED: 'authorized',
    CAPTURED: 'captured',
    REFUNDED: 'refunded',
    FAILED: 'failed',
  },
  ORDER_STAGES: {
    CREATED: 'created',
    ATTEMPTED: 'attempted',
    PAID: 'paid',
    SHIPPED: 'shipped',
  },
  ORDER_TYPES: {
    HYBRID: 'hybrid',
    PURCHASE: 'purchase',
    RENTAL: 'rental',
    SUBSCRIPTION: 'subscription'
  },
  SUBSCRIPTION_STATUSES: {
    CREATED: 'created',
    AUTHENTICATED: 'authenticated',
    ACTIVE: 'active',
    PENDING: 'pending',
    HALTED: 'halted',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    EXPIRED: 'expired',
  },
  SUBSCRIPTION_PERIODS: {
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  },
};
