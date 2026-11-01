import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { adminBundleCreatePayloadSchema, adminBundleUpdatePayloadSchema } from '@pageaters/shared';
import { API_CLIENT } from './api-client';
import { parsePayload, type AdminBody } from './payload';

@Injectable({ providedIn: 'root' })
export class BundleService {
  private client = inject(API_CLIENT);

  getAllBundles(filters: { page: number; limit: number }) {
    return defer(() => this.client.bundles.list({ page: filters.page, limit: filters.limit }));
  }

  searchBundles(q: string) {
    return defer(() => this.client.bundles.search({ q }));
  }

  create(payload: unknown) {
    return defer(() => this.client.admin.bundles.create(parsePayload<AdminBody<'bundles', 'create'>>(adminBundleCreatePayloadSchema, payload)));
  }

  getById(id: string) {
    return defer(() => this.client.admin.bundles.detail({ id }));
  }

  getByUniqueId(id: string) {
    return defer(() => this.client.bundles.detail({ id }));
  }

  update(id: string, payload: unknown) {
    return defer(() => this.client.admin.bundles.update({ ...parsePayload<AdminBody<'bundles', 'update'>>(adminBundleUpdatePayloadSchema, payload), id }));
  }
}
