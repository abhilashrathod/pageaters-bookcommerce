import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCard, MatCardTitle, MatCardContent } from '@angular/material/card';
import type { AdminBookAnalytics, Book } from '@pageaters/shared';
import { BooksService } from '@services/books.service';
import { AnalyticsService } from '@services/analytics.service';
import { apiErrorMessage } from '@services/api-client';
import { formatInr } from '@helpers/analytics';
import { InrPipe } from '@helpers/inr.pipe';
import { BarChartComponent, type BarPoint } from '@components/bar-chart/bar-chart.component';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-book-view',
  templateUrl: 'book-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCard, MatCardTitle, MatCardContent, DatePipe, RouterLink, InrPipe, BarChartComponent],
})
export class BookViewComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private booksService = inject(BooksService);
  private analyticsService = inject(AnalyticsService);

  book = signal<Book | null>(null);
  stats = signal<AdminBookAnalytics | null>(null);

  authorName = computed(() => {
    const author = this.book()?.author;
    return author && typeof author === 'object' ? (author.name ?? '') : '';
  });

  monthPoints = computed<BarPoint[]>(() =>
    (this.stats()?.salesByMonth ?? []).map((m) => ({
      label: MONTHS[Number(m.month.slice(5, 7)) - 1] ?? m.month,
      value: m.units,
      title: `${m.month}: ${m.units} units · ${formatInr(m.revenue)}`,
    })),
  );

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params.id) this.load(params.id);
    });
  }

  private load(id: string): void {
    const fail = (err: unknown) => this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
    this.booksService.getById(id).subscribe({ next: (b) => this.book.set(b), error: fail });
    this.analyticsService.book(id).subscribe({ next: (s) => this.stats.set(s), error: fail });
  }
}
