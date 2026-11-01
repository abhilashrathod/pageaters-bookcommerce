import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { BundleService } from '@services/bundle.service';
import { IBundle } from '@schema/bundle';
import { BUCKETS } from '@helpers/constants';

@Component({
  selector: 'app-bundle-rearrange',
  templateUrl: 'bundle-rearrange.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class BundleRearrangeComponent implements OnInit {
  bundles: Array<IBundle> = [];
  IMAGE_BASE = BUCKETS.BUNDLES;

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
