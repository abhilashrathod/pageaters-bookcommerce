import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { defer, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_CLIENT } from './api-client';

// The shared demo admin (seed/src/accounts.ts). In demo mode the API refuses its catalog writes and uploads
// (`DEMO_ADMIN_READ_ONLY`); the forms say so up front instead of letting a save fail.
export const DEMO_ADMIN_EMAIL = 'admin@demo.pageaters.com';

export function isDemoAdminEmail(email: string | null | undefined): boolean {
  return email === DEMO_ADMIN_EMAIL;
}

@Injectable({ providedIn: 'root' })
export class DemoAdminService {
  private client = inject(API_CLIENT);

  /** True when the logged-in admin is the demo admin: catalog forms are read-only. */
  readonly readOnly = toSignal(
    defer(() => this.client.auth.me()).pipe(
      map((user) => isDemoAdminEmail(user.email)),
      catchError(() => of(false)),
    ),
    { initialValue: false },
  );
}
