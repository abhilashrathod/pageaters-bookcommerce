import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '@services/customer.service';
import type { AdminUserDetails } from '@pageaters/shared';
import { ORDER_STATUSES } from '@helpers/constants';
import { MatCard, MatCardContent, MatCardTitle, MatCardSubtitle } from '@angular/material/card';
import { DecimalPipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-view-customer',
  templateUrl: 'view-customer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatCard, MatCardContent, MatCardTitle, MatCardSubtitle, DecimalPipe, CurrencyPipe],
})
export class ViewCustomerComponent implements OnInit {
  details: AdminUserDetails = {
    user: null,
    cart: null,
    addresses: [],
    orders: [],
  };
  isReady = false;

  shipped = 0;
  fulfilled = 0;
  cancelled = 0;
  pending = 0;
  refunded = 0;
  returned = 0;

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private customerService: CustomerService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      if (params.id) {
        this.getOrderDetails(params.id);
      }
    });
  }

  getOrderDetails(id): void {
    const user$ = this.customerService.getById(id);
    user$.subscribe(
      (res) => {
        this.details = res;
        this.isReady = true;

        console.log('user', this.details);

        this.details.orders = this.details.orders.filter((x) => x.orderStatus !== ORDER_STATUSES.ATTEMPTED);
        this.getPastOrderStats(this.details.orders);
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  getPastOrderStats(orders): void {
    this.pending = orders.filter((x) => x.orderStatus === ORDER_STATUSES.PAID || x.orderStatus === ORDER_STATUSES.CONFIRMED).length;
    this.fulfilled = orders.filter((x) => x.orderStatus === ORDER_STATUSES.FULFILLED).length;
    this.cancelled = orders.filter((x) => x.orderStatus === ORDER_STATUSES.CANCELLED).length;
    this.shipped = orders.filter((x) => x.orderStatus === ORDER_STATUSES.SHIPPED).length;
    this.returned = orders.filter(
      (x) =>
        x.orderStatus === ORDER_STATUSES.RETURNED ||
        x.orderStatus === ORDER_STATUSES.REPLACEMENT ||
        x.orderStatus === ORDER_STATUSES.REPLACEMENT_IN_PROGRESS ||
        x.orderStatus === ORDER_STATUSES.RETURNED_IN_PROGRESS,
    ).length;
    this.shipped = orders.filter((x) => x.orderStatus === ORDER_STATUSES.SHIPPED).length;
    this.refunded = orders.filter((x) => x.orderStatus === ORDER_STATUSES.REFUNDED).length;
  }
}
