import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '@pageaters/api-client';
import { describe, expect, it, vi } from 'vitest';
import { API_CLIENT, apiErrorMessage } from '@services/api-client';
import { canCancelOrder, OrderServices } from '@services/order.services';

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

describe('OrderServices', () => {
  function serviceWith(orders: Record<string, unknown>) {
    TestBed.configureTestingModule({ providers: [{ provide: API_CLIENT, useValue: { admin: { orders } } }] });
    return TestBed.inject(OrderServices);
  }

  it('loads one order by id', async () => {
    const detail = vi.fn().mockResolvedValue({ _id: 'o1', orderId: 'PE-1001' });
    const order = await serviceWith({ detail }).getById('o1').toPromise();
    expect(detail).toHaveBeenCalledWith({ id: 'o1' });
    expect(order).toEqual({ _id: 'o1', orderId: 'PE-1001' });
  });

  it('ships an order with its tracking id', async () => {
    const ship = vi.fn().mockResolvedValue({ _id: 'o1', orderStatus: 'shipped' });
    await serviceWith({ ship }).ship({ orderId: 'o1', shipmentTrackingId: 'TRK123' }).toPromise();
    expect(ship).toHaveBeenCalledWith({ orderId: 'o1', shipmentTrackingId: 'TRK123' });
  });

  it('marks an order delivered', async () => {
    const deliver = vi.fn().mockResolvedValue({ _id: 'o1', orderStatus: 'fulfilled' });
    await serviceWith({ deliver }).fulfilled('o1').toPromise();
    expect(deliver).toHaveBeenCalledWith({ id: 'o1' });
  });

  it('does not call the API until subscribed', () => {
    const deliver = vi.fn().mockResolvedValue({});
    serviceWith({ deliver }).fulfilled('o1');
    expect(deliver).not.toHaveBeenCalled();
  });
});
