import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  templateUrl: 'dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DashboardComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
