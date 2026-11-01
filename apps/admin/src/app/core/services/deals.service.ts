import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { adminDealCreatePayloadSchema, adminDealUpdatePayloadSchema } from '@pageaters/shared';
import { API_CLIENT } from './api-client';
import { parsePayload, type AdminBody } from './payload';

@Injectable({ providedIn: 'root' })
export class DealsService {
  private client = inject(API_CLIENT);

  getAllDeals(filters: { page: number; limit: number }) {
    return defer(() => this.client.deals.list({ page: filters.page, limit: filters.limit }));
  }

  create(payload: unknown) {
    return defer(() => this.client.admin.deals.create(parsePayload<AdminBody<'deals', 'create'>>(adminDealCreatePayloadSchema, payload)));
  }

  getById(id: string) {
    return defer(() => this.client.admin.deals.detail({ id }));
  }

  update(id: string, payload: unknown) {
    return defer(() => this.client.admin.deals.update({ ...parsePayload<AdminBody<'deals', 'update'>>(adminDealUpdatePayloadSchema, payload), id }));
  }

  destroy(id: string) {
    return defer(() => this.client.admin.deals.remove({ id }));
  }
}
