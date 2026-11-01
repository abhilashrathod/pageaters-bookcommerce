import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { adminCategoryCreatePayloadSchema, adminCategoryUpdatePayloadSchema } from '@pageaters/shared';
import { API_CLIENT } from './api-client';
import { parsePayload, type AdminBody } from './payload';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private client = inject(API_CLIENT);

  getAllCategories(filters: { page: number; limit: number }) {
    return defer(() => this.client.categories.list({ page: filters.page, limit: filters.limit }));
  }

  searchCategories(q: string) {
    return defer(() => this.client.categories.search({ q }));
  }

  create(payload: unknown) {
    return defer(() => this.client.admin.categories.create(parsePayload<AdminBody<'categories', 'create'>>(adminCategoryCreatePayloadSchema, payload)));
  }

  getById(id: string) {
    return defer(() => this.client.admin.categories.detail({ id }));
  }

  getByUniqueId(id: string) {
    return defer(() => this.client.categories.detail({ id }));
  }

  update(id: string, payload: unknown) {
    return defer(() => this.client.admin.categories.update({ ...parsePayload<AdminBody<'categories', 'update'>>(adminCategoryUpdatePayloadSchema, payload), id }));
  }
}
