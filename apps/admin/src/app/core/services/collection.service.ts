import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { adminCollectionCreatePayloadSchema, adminCollectionUpdatePayloadSchema } from '@pageaters/shared';
import { API_CLIENT } from './api-client';
import { parsePayload, type AdminBody } from './payload';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private client = inject(API_CLIENT);

  getAllCollections(filters: { page: number; limit: number }) {
    return defer(() => this.client.collections.list({ page: filters.page, limit: filters.limit }));
  }

  searchCollections(q: string) {
    return defer(() => this.client.collections.search({ q }));
  }

  create(payload: unknown) {
    return defer(() => this.client.admin.collections.create(parsePayload<AdminBody<'collections', 'create'>>(adminCollectionCreatePayloadSchema, payload)));
  }

  getById(id: string) {
    return defer(() => this.client.admin.collections.detail({ id }));
  }

  getByUniqueId(id: string) {
    return defer(() => this.client.collections.detail({ id }));
  }

  update(id: string, payload: unknown) {
    return defer(() => this.client.admin.collections.update({ ...parsePayload<AdminBody<'collections', 'update'>>(adminCollectionUpdatePayloadSchema, payload), id }));
  }
}
