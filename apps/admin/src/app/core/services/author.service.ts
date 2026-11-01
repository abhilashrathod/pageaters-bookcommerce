import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { adminAuthorCreatePayloadSchema, adminAuthorUpdatePayloadSchema } from '@pageaters/shared';
import { API_CLIENT } from './api-client';
import { parsePayload, type AdminBody } from './payload';

@Injectable({ providedIn: 'root' })
export class AuthorService {
  private client = inject(API_CLIENT);

  getAllAuthors(filters: { page: number; limit: number }) {
    return defer(() => this.client.authors.list({ page: filters.page, limit: filters.limit }));
  }

  searchAuthors(q: string) {
    return defer(() => this.client.authors.search({ q }));
  }

  create(payload: unknown) {
    return defer(() => this.client.admin.authors.create(parsePayload<AdminBody<'authors', 'create'>>(adminAuthorCreatePayloadSchema, payload)));
  }

  getById(id: string) {
    return defer(() => this.client.admin.authors.detail({ id }));
  }

  getByUniqueId(id: string) {
    return defer(() => this.client.authors.detail({ id }));
  }

  update(id: string, payload: unknown) {
    return defer(() => this.client.admin.authors.update({ ...parsePayload<AdminBody<'authors', 'update'>>(adminAuthorUpdatePayloadSchema, payload), id }));
  }
}
