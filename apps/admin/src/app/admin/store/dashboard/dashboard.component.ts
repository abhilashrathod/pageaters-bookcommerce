import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DealsService } from '@services/deals.service';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardTitle, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatFormField, MatLabel, MatInput, FormsModule, MatCard, RouterLink, MatCardTitle, MatCardContent],
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
