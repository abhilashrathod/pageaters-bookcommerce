import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import type { AdminCart } from '@pageaters/shared';
import { API_CLIENT } from '@services/api-client';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private client = inject(API_CLIENT);

  getById(id: string): Observable<AdminCart> {
    return defer(() => this.client.admin.carts.detail({ id }));
  }
}
