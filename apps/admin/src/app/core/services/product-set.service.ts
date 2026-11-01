import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { adminProductSetCreatePayloadSchema, adminProductSetUpdatePayloadSchema } from '@pageaters/shared';
import { API_CLIENT } from './api-client';
import { parsePayload, type AdminBody } from './payload';

@Injectable({ providedIn: 'root' })
export class ProductSetService {
  private client = inject(API_CLIENT);

  getAllProductSet(filters: { page: number; limit: number; categories?: string }) {
    return defer(() => this.client.admin.productSets.list(filters));
  }

  create(payload: unknown) {
    return defer(() => this.client.admin.productSets.create(parsePayload<AdminBody<'productSets', 'create'>>(adminProductSetCreatePayloadSchema, payload)));
  }

  getById(id: string) {
    return defer(() => this.client.admin.productSets.detail({ id }));
  }

  update(id: string, payload: unknown) {
    return defer(() =>
      this.client.admin.productSets.update({ ...parsePayload<AdminBody<'productSets', 'update'>>(adminProductSetUpdatePayloadSchema, payload), id }),
    );
  }
}
