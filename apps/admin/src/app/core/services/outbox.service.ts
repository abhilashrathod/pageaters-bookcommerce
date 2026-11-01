import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import type { OutboxMessage } from '@pageaters/shared';
import { API_CLIENT } from '@services/api-client';

@Injectable({
  providedIn: 'root',
})
export class OutboxService {
  private client = inject(API_CLIENT);

  /** The demo outbox: the newest 50 messages the mock e-mail/SMS adapters "sent" (404 outside DEMO_MODE). */
  list(): Observable<OutboxMessage[]> {
    return defer(() => this.client.outbox.list());
  }
}
