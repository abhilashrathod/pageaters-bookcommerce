import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  templateUrl: 'layout.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class LayoutComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
