import { TestBed } from '@angular/core/testing';
import { adminAuthorCreatePayloadSchema, adminAuthorUpdatePayloadSchema } from '@pageaters/shared';
import { describe, expect, it, vi } from 'vitest';
import { API_CLIENT } from './api-client';
import { AuthorService } from './author.service';
import { DemoAdminService, isDemoAdminEmail } from './demo-admin.service';
import { parsePayload } from './payload';

const avatar = 'https://example.public.blob.vercel-storage.com/authors/jane-doe.jpg';
const loadedAuthor = { _id: '0123456789abcdef01234567', authorId: 'jane-doe', name: 'Jane Doe', intro: 'Writes books.', avatar, books: [] };

function withClient(client: unknown) {
  TestBed.configureTestingModule({ providers: [{ provide: API_CLIENT, useValue: client }] });
}

describe('catalog payloads', () => {
  it('drops keys the contract leaves out and keeps full image URLs as they are', () => {
    const payload = parsePayload<Record<string, unknown>>(adminAuthorUpdatePayloadSchema, {
      ...loadedAuthor,
      wholeSalePriceHistory: [{ price: 1 }],
    });
    expect(payload).toEqual({ name: 'Jane Doe', intro: 'Writes books.', avatar, books: [] });
  });

  it('throws the first zod issue, naming its field', () => {
    expect(() => parsePayload(adminAuthorCreatePayloadSchema, { avatar })).toThrow(/^name: /);
  });

  it('sends the parsed payload with the path id', async () => {
    const update = vi.fn().mockResolvedValue(loadedAuthor);
    withClient({ admin: { authors: { update } } });
    await TestBed.inject(AuthorService).update(loadedAuthor._id, { ...loadedAuthor, isDeleted: false }).toPromise();
    expect(update).toHaveBeenCalledWith({ id: loadedAuthor._id, name: 'Jane Doe', intro: 'Writes books.', avatar, books: [] });
  });

  it('does not call the API when the payload is invalid', async () => {
    const create = vi.fn();
    withClient({ admin: { authors: { create } } });
    await expect(TestBed.inject(AuthorService).create({ avatar }).toPromise()).rejects.toThrow(/^name: /);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('demo admin read-only flag', () => {
  it('matches only the demo admin account', () => {
    expect(isDemoAdminEmail('admin@demo.pageaters.com')).toBe(true);
    expect(isDemoAdminEmail('owner@example.com')).toBe(false);
    expect(isDemoAdminEmail(undefined)).toBe(false);
  });

  it('is on for the logged-in demo admin', async () => {
    withClient({ auth: { me: () => Promise.resolve({ email: 'admin@demo.pageaters.com' }) } });
    const demoAdmin = TestBed.inject(DemoAdminService);
    expect(demoAdmin.readOnly()).toBe(false);
    await vi.waitFor(() => expect(demoAdmin.readOnly()).toBe(true));
  });
});
