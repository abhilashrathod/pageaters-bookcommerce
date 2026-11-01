import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '@pageaters/api-client';
import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from '@services/api-client';
import { canCancelOrder } from '@services/order.services';

describe('canCancelOrder', () => {
  it('allows cancelling a paid or confirmed order', () => {
    expect(canCancelOrder('paid')).toBe(true);
    expect(canCancelOrder('confirmed')).toBe(true);
  });

  it('hides cancel once the order is shipped or delivered', () => {
    expect(canCancelOrder('shipped')).toBe(false);
    expect(canCancelOrder('fulfilled')).toBe(false);
  });
});

describe('apiErrorMessage', () => {
  it("shows the API's message from an ApiError", () => {
    const error = new ApiError({ statusCode: 400, code: 'ORDER_CANCEL_INVALID', message: 'Order cannot be cancelled' });
    expect(apiErrorMessage(error)).toBe('Order cannot be cancelled');
  });

  it("shows the API's message from an HttpClient error", () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'Bad request body' } });
    expect(apiErrorMessage(error)).toBe('Bad request body');
  });

  it('falls back to a plain sentence, never [object Object]', () => {
    expect(apiErrorMessage({})).toBe('Something went wrong');
  });
});
