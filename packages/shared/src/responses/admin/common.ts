import { z } from 'zod';

import { addressSchema } from '../../commerce/address.ts';
import { userSchema } from '../../commerce/user.ts';
import { apiResponse } from '../../primitives.ts';

// Shared pieces of the admin responses. Soft-delete flags (`isDeleted`, `deletedAt`) are never part of an admin
// response: the schemas below omit them where the shared entity carries them, and `z.object` strips them on parse.

// `data: {}`: deletes (`res.ok('…_DELETE_SUCCESS')`), the order request steps, cancel, and store credit issue.
// Strict: these acknowledgements carry nothing.
export const adminEmptyDataSchema = z.strictObject({});
export type AdminEmptyData = z.infer<typeof adminEmptyDataSchema>;
export const adminEmptyResponseSchema = apiResponse(adminEmptyDataSchema);

// A saved address as the admin sees it (order delivery address, a customer's address book).
export const adminAddressSchema = addressSchema.omit({ isDeleted: true, deletedAt: true });
export type AdminAddress = z.infer<typeof adminAddressSchema>;

// The customer as order and stock-alert views populate it (`select: 'fullName email contactNo'`).
export const adminCustomerSchema = userSchema.pick({ _id: true, fullName: true, email: true, contactNo: true });
export type AdminCustomer = z.infer<typeof adminCustomerSchema>;
