import { userSchema } from '../../commerce/user.ts';
import { apiResponse } from '../../primitives.ts';

// POST /auth/login, GET /auth/me, PUT /auth/me: `User.getProfile()`, credentials selected away; parsing through
// `userSchema` drops anything else the model grows. The other auth endpoints answer `shopperEmptyResponseSchema`.
export const shopperProfileResponseSchema = apiResponse(userSchema);
