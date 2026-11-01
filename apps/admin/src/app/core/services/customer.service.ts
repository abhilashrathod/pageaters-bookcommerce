import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import type { AdminUserDetails } from '@pageaters/shared';
import { API_CLIENT } from '@services/api-client';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private client = inject(API_CLIENT);

  // validate: true strips credential fields the legacy API still sends on user documents (see api-client users.ts).
  getById(id: string): Observable<AdminUserDetails> {
    return defer(() => this.client.admin.users.detail({ id }, { validate: true }));
  }
}
