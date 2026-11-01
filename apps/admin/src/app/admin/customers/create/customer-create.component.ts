import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-customers-create',
  templateUrl: 'customer-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CustomerCreateComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
