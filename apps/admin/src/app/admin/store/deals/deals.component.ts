import {Component, OnInit} from '@angular/core';
import {DealsService} from '../../../core/services/deals.service';
import {MatSnackBar} from '@angular/material/snack-bar';

import {AppLoaderService} from '../../../core/components/app-loader/app-loader.service';
import {AppConfirmService} from '../../../core/components/app-confirm/app-confirm.service';

import {IDeal} from '../../../core/schema/deal';
import {BUCKETS} from '../../../core/helpers/constants';

@Component({
  selector: 'app-deals',
  templateUrl: 'deals.component.html'
})

export class DealsComponent implements OnInit {

  deals: Array<IDeal>;
  BASE = BUCKETS.ASSETS;

  constructor(private dealsService: DealsService,
              private confirm: AppConfirmService,
              private snack: MatSnackBar,
              private loading: AppLoaderService,) {

  }

  ngOnInit(): void {
    this.getDealsListing();
  }

  getDealsListing(): void {
    this.dealsService.getAllDeals({page: 1, limit: 25})
      .subscribe(res => {
        this.deals = res.docs;
      });
  }

  handleDelete(id): void {
    const confirm = this.confirm.confirm('Warning!', 'Are you sure you want to delete this record');
    confirm.subscribe(res => {
      if (res) {
        const delete$ = this.dealsService.destroy(id);
        this.loading.open();
        delete$.subscribe(() => {
          this.loading.close();
          this.getDealsListing();
          this.snack.open('Record deleted', 'OKAY', {duration: 3000});
        }, err => {
          this.loading.close();
          this.snack.open(err.message.toString(), 'OKAY', {duration: 5000});
        });
      }
    });
  }
}
