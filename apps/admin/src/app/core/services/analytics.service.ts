import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import type { AdminBookAnalytics, AdminCustomerAnalytics, AdminStoreSummary } from '@pageaters/shared';
import { API_CLIENT } from '@services/api-client';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private client = inject(API_CLIENT);

  summary(): Observable<AdminStoreSummary> {
    return defer(() => this.client.admin.analytics.summary());
  }

  book(id: string): Observable<AdminBookAnalytics> {
    return defer(() => this.client.admin.analytics.book({ id }));
  }

  customer(id: string): Observable<AdminCustomerAnalytics> {
    return defer(() => this.client.admin.analytics.customer({ id }));
  }
}
