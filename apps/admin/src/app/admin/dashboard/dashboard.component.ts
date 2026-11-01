import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';

@Component({
  templateUrl: 'dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatTabGroup, MatTab],
})
export class DashboardComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
