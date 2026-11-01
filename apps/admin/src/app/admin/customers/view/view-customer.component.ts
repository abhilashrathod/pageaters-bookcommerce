import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardTitle } from '@angular/material/card';
import type { AdminCart, AdminCustomerAnalytics, AdminUserDetails } from '@pageaters/shared';
import { CustomerService } from '@services/customer.service';
import { AnalyticsService } from '@services/analytics.service';
import { CartService } from '@services/cart.service';
import { apiErrorMessage } from '@services/api-client';
import { cartLines, cartTotal, statusRows } from '@helpers/analytics';
import { InrPipe } from '@helpers/inr.pipe';

@Component({
  selector: 'app-view-customer',
  templateUrl: 'view-customer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCard, MatCardContent, MatCardTitle, DatePipe, RouterLink, InrPipe],
})
export class ViewCustomerComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private analyticsService = inject(AnalyticsService);
  private cartService = inject(CartService);

  details = signal<AdminUserDetails | null>(null);
  stats = signal<AdminCustomerAnalytics | null>(null);
  cart = signal<AdminCart | null>(null);

  statuses = computed(() => statusRows(this.stats()?.ordersByStatus ?? {}));
  lines = computed(() => (this.cart() ? cartLines(this.cart()) : []));
  total = computed(() => cartTotal(this.lines()));

  ngOnInit() {
    this.route.params.subscribe((params) => {
      if (params.id) this.load(params.id);
    });
  }

  private load(id: string): void {
    const fail = (err: unknown) => this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
    this.customerService.getById(id).subscribe({
      next: (res) => {
        this.details.set(res);
        if (res.cart) this.cartService.getById(res.cart._id).subscribe({ next: (c) => this.cart.set(c), error: fail });
      },
      error: fail,
    });
    this.analyticsService.customer(id).subscribe({ next: (s) => this.stats.set(s), error: fail });
  }
}
