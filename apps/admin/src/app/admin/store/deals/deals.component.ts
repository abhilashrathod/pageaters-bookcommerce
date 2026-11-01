import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DealsService } from '@services/deals.service';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AppLoaderService } from '@components/app-loader/app-loader.service';
import { AppConfirmService } from '@components/app-confirm/app-confirm.service';

import type { DealListItem } from '@pageaters/shared';
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardSubtitle,
  MatCardImage,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatButton, MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-deals',
  templateUrl: 'deals.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardImage,
    MatCardContent,
    MatCardActions,
    MatButton,
    RouterLink,
    MatFabButton,
    MatIcon,
  ],
})
export class DealsComponent implements OnInit {
  deals: Array<DealListItem>;

  constructor(
    private dealsService: DealsService,
    private confirm: AppConfirmService,
    private snack: MatSnackBar,
    private loading: AppLoaderService,
  ) {}

  ngOnInit(): void {
    this.getDealsListing();
  }

  getDealsListing(): void {
    this.dealsService.getAllDeals({ page: 1, limit: 25 }).subscribe((res) => {
      this.deals = res.docs;
    });
  }

  handleDelete(id): void {
    const confirm = this.confirm.confirm('Warning!', 'Are you sure you want to delete this record');
    confirm.subscribe((res) => {
      if (res) {
        const delete$ = this.dealsService.destroy(id);
        this.loading.open();
        delete$.subscribe(
          () => {
            this.loading.close();
            this.getDealsListing();
            this.snack.open('Record deleted', 'OKAY', { duration: 3000 });
          },
          (err) => {
            this.loading.close();
            this.snack.open(err.message.toString(), 'OKAY', { duration: 5000 });
          },
        );
      }
    });
  }
}
