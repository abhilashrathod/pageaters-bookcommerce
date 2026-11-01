import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import type {
  AdminOrder,
  AdminOrderCancelPayload,
  AdminOrderShipPayload,
  AdminOrderWithCustomer,
  AdminReturnShipmentPayload,
  AdminShipmentCreatePayload,
  AdminShipmentCreateResult,
  AdminStoreCreditIssuePayload,
  OrderStatus,
} from '@pageaters/shared';
import { API_CLIENT } from '@services/api-client';

/** Only a paid or confirmed order can be cancelled: once shipped or delivered, the API refuses (no cancel after shipping). */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'paid' || status === 'confirmed';
}

@Injectable({
  providedIn: 'root',
})
export class OrderServices {
  private client = inject(API_CLIENT);

  getById(id: string): Observable<AdminOrder> {
    return defer(() => this.client.admin.orders.detail({ id }));
  }

  /** FORWARD SHIPMENT **/
  ship(payload: AdminOrderShipPayload): Observable<AdminOrderWithCustomer> {
    return defer(() => this.client.admin.orders.ship(payload));
  }

  fulfilled(id: string): Observable<AdminOrderWithCustomer> {
    return defer(() => this.client.admin.orders.deliver({ id }));
  }

  /** RETURN / REPLACEMENT SHIPMENTS **/

  alignReturnShipment(id: string, requestId: string, payload: AdminReturnShipmentPayload): Observable<unknown> {
    return defer(() => this.client.admin.orders.alignReturnShipment({ id, requestId, ...payload }));
  }

  closeReturnShipment(id: string, requestId: string): Observable<unknown> {
    return defer(() => this.client.admin.orders.closeReturn({ id, requestId }));
  }

  closeReplacementShipment(id: string, requestId: string): Observable<unknown> {
    return defer(() => this.client.admin.orders.closeReplacement({ id, requestId }));
  }

  issueStoreCredit(payload: AdminStoreCreditIssuePayload): Observable<unknown> {
    return defer(() => this.client.admin.storeCredit.issue(payload));
  }

  createShipment(orderId: string, payload: AdminShipmentCreatePayload): Observable<AdminShipmentCreateResult> {
    return defer(() => this.client.admin.orders.createShipment({ orderId, ...payload }));
  }

  cancelOrder(payload: AdminOrderCancelPayload): Observable<unknown> {
    return defer(() => this.client.admin.orders.cancel({ id: payload.uniqueId, ...payload }));
  }
}
