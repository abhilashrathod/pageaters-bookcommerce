import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-order-create',
  templateUrl: 'order-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class OrderCreateComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
