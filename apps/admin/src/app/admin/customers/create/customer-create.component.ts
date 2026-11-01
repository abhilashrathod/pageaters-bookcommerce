import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-customers-create',
  templateUrl: 'customer-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatFabButton, RouterLink, MatIcon],
})
export class CustomerCreateComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
