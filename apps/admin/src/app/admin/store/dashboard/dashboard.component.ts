import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DealsService } from '@services/deals.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DashboardComponent implements OnInit {
  announcement = '';
  contactNo = '';
  email = '';
  address = '';

  dealsStat = 0;

  constructor(private dealsService: DealsService) {}

  ngOnInit(): void {
    this.getDealsStats();
  }

  getDealsStats(): void {
    this.dealsService.getAllDeals({ page: 1, limit: 3 }).subscribe((res) => {
      this.dealsStat = res.totalDocs;
    });
  }
}
