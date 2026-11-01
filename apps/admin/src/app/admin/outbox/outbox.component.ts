import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { isApiError } from '@pageaters/api-client';
import type { OutboxMessage } from '@pageaters/shared';
import { apiErrorMessage } from '@services/api-client';
import { OutboxService } from '@services/outbox.service';

/** The message's subject (e-mails) or the start of its text, with any HTML tags removed. */
export function outboxPreview(message: OutboxMessage): string {
  if (message.subject) return message.subject;
  const text = message.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

@Component({
  selector: 'app-outbox',
  templateUrl: './outbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
})
export class OutboxComponent implements OnInit {
  private outboxService = inject(OutboxService);

  readonly messages = signal<OutboxMessage[]>([]);
  readonly loading = signal(true);
  readonly notInDemo = signal(false);
  readonly error = signal('');
  readonly preview = outboxPreview;

  ngOnInit(): void {
    this.outboxService.list().subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        if (isApiError(err) && err.statusCode === 404) this.notInDemo.set(true);
        else this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
