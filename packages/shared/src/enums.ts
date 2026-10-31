import { z } from 'zod';

// Domain enums ported from apps/api/src/constants/enums.js. Values are exactly what the API stores in MongoDB;
// keys match the API's so the Phase 4 swap is mechanical (one typo fixed: NET_BAKING → NET_BANKING).
// Each enum is a const object (for `UserRole.ADMIN`), a zod schema and the inferred type, sharing one name.

// User.role. The super-admin and demo roles arrive in Phase 5.
export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export const userRoleSchema = z.enum(UserRole);
export type UserRole = z.infer<typeof userRoleSchema>;

// User.status. Only ACTIVE users can log in.
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
} as const;
export const userStatusSchema = z.enum(UserStatus);
export type UserStatus = z.infer<typeof userStatusSchema>;

// Address.type.
export const AddressType = {
  HOME: 'HOME',
  OFFICE: 'OFFICE',
} as const;
export const addressTypeSchema = z.enum(AddressType);
export type AddressType = z.infer<typeof addressTypeSchema>;

// StoreBook.type: the store-books collection also holds book boxes, blind books and mystery boxes.
export const ProductType = {
  BOOK: 'book',
  BUNDLE: 'bundle',
  BOOKISH_BOOK: 'book_box',
  BLIND_BOOK: 'blind_book',
  MYSTERY_BOX: 'mystery_box',
} as const;
export const productTypeSchema = z.enum(ProductType);
export type ProductType = z.infer<typeof productTypeSchema>;

// GET /store-books?list=: only books with this flag set (the CMS Featured Books block picks one).
export const BookListFlag = {
  BEST_SELLER: 'bestSeller',
  EDITORS_PICK: 'editorsPick',
  NEW_RELEASE: 'newRelease',
  PRE_ORDER: 'preOrder',
} as const;
export const bookListFlagSchema = z.enum(BookListFlag);
export type BookListFlag = z.infer<typeof bookListFlagSchema>;

// StoreBook.version (binding).
export const BookVersion = {
  HARDCOVER: 'hardcover',
  PAPERBACK: 'paperback',
  MASS_MARKET: 'mass market paperback',
} as const;
export const bookVersionSchema = z.enum(BookVersion);
export type BookVersion = z.infer<typeof bookVersionSchema>;

// StoreBook.readingLevel. 'Advance' (sic) is the stored value.
export const ReadingLevel = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCE: 'Advance',
} as const;
export const readingLevelSchema = z.enum(ReadingLevel);
export type ReadingLevel = z.infer<typeof readingLevelSchema>;

// StoreBook.availability.
export const BookAvailability = {
  AVAILABLE: 'available',
  PROCUREMENT: 'procurement',
  IMPORT: 'import',
  PRE_ORDER: 'pre-order',
} as const;
export const bookAvailabilitySchema = z.enum(BookAvailability);
export type BookAvailability = z.infer<typeof bookAvailabilitySchema>;

// Order.orderStatus (the API's ORDER_STAGES). An order starts ATTEMPTED at checkout, becomes CREATED when an
// online payment is opened (or CONFIRMED for cash on delivery) and PAID once Razorpay captures it.
export const OrderStatus = {
  ATTEMPTED: 'attempted',
  CREATED: 'created',
  PAID: 'paid',
  SHIPPED: 'shipped',
  CONFIRMED: 'confirmed',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REPLACEMENT: 'replacement',
  RETURNED_IN_PROGRESS: 'return in progress',
  REPLACEMENT_IN_PROGRESS: 'replacement in progress',
  REFUNDED: 'refunded',
} as const;
export const orderStatusSchema = z.enum(OrderStatus);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Order.requests[].type: a customer's return, replacement or cancellation request.
export const OrderRequestType = {
  RETURN: 'return',
  REPLACE: 'replace',
  CANCEL: 'cancel',
} as const;
export const orderRequestTypeSchema = z.enum(OrderRequestType);
export type OrderRequestType = z.infer<typeof orderRequestTypeSchema>;

// Order.requests[].status.
export const OrderRequestStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in progress',
  CLOSED: 'closed',
} as const;
export const orderRequestStatusSchema = z.enum(OrderRequestStatus);
export type OrderRequestStatus = z.infer<typeof orderRequestStatusSchema>;

// Order.payment.method: Razorpay's payment method names, plus cash on delivery.
export const PaymentMethod = {
  CARD: 'card',
  NET_BANKING: 'netbanking',
  WALLET: 'wallet',
  EMI: 'emi',
  UPI: 'upi',
  COD: 'cod',
} as const;
export const paymentMethodSchema = z.enum(PaymentMethod);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
