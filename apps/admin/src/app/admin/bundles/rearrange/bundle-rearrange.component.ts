import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { BundleService } from '@services/bundle.service';
import type { BundleListItem } from '@pageaters/shared';
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardSubtitle,
  MatCardImage,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { DecimalPipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-bundle-rearrange',
  templateUrl: 'bundle-rearrange.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    SortablejsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatCardTitle,
    MatCardSubtitle,
    MatCardImage,
    MatCardContent,
    MatCardActions,
    MatButton,
    DecimalPipe,
    CurrencyPipe,
  ],
})
export class BundleRearrangeComponent implements OnInit {
  bundles: Array<BundleListItem> = [];

  constructor(private bundleService: BundleService) {}

  ngOnInit() {
    this.getAllBundles();
  }

  getAllBundles(): void {
    const all$ = this.bundleService.getAllBundles({ page: 1, limit: 1000 });
    all$.subscribe((res) => {
      this.bundles = res.docs;
    });
  }
}
