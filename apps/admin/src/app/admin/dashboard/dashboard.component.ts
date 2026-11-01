import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardTitle } from '@angular/material/card';
import type { AdminStoreSummary } from '@pageaters/shared';
import { AnalyticsService } from '@services/analytics.service';
import { apiErrorMessage } from '@services/api-client';
import { formatInr, statusRows } from '@helpers/analytics';
import { InrPipe } from '@helpers/inr.pipe';
import { BarChartComponent, type BarPoint } from '@components/bar-chart/bar-chart.component';

@Component({
  templateUrl: 'dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCard, MatCardContent, MatCardTitle, DatePipe, RouterLink, InrPipe, BarChartComponent],
})
export class DashboardComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  summary = signal<AdminStoreSummary | null>(null);
  error = signal('');

  statuses = computed(() => statusRows(this.summary()?.orders.byStatus ?? {}));
  salesPoints = computed<BarPoint[]>(() =>
    (this.summary()?.salesByDay ?? []).map((d) => ({
      label: d.date.slice(8), // day of month
      value: d.revenue,
      title: `${d.date}: ${formatInr(d.revenue)} · ${d.orders} orders`,
    })),
  );

  ngOnInit() {
    this.analytics.summary().subscribe({
      next: (s) => this.summary.set(s),
      error: (err) => this.error.set(apiErrorMessage(err)),
    });
  }
}
