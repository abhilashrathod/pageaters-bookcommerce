import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { adminBookCreatePayloadSchema, adminBookUpdatePayloadSchema } from '@pageaters/shared';
import { API_CLIENT } from './api-client';
import { parsePayload, type AdminBody } from './payload';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private client = inject(API_CLIENT);

  getAllBooks(filters: { page: number; limit: number }) {
    return defer(() => this.client.books.list({ page: filters.page, limit: filters.limit }));
  }

  searchBooks(q: string) {
    return defer(() => this.client.books.search({ q }));
  }

  create(payload: unknown) {
    return defer(() => this.client.admin.storeBooks.create(parsePayload<AdminBody<'storeBooks', 'create'>>(adminBookCreatePayloadSchema, payload)));
  }

  getById(id: string) {
    return defer(() => this.client.admin.storeBooks.detail({ id }));
  }

  getByUniqueId(id: string) {
    return defer(() => this.client.books.detail({ id }));
  }

  update(id: string, payload: unknown) {
    return defer(() => this.client.admin.storeBooks.update({ ...parsePayload<AdminBody<'storeBooks', 'update'>>(adminBookUpdatePayloadSchema, payload), id }));
  }
}
