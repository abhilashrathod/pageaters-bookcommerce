import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-order-create',
  templateUrl: 'order-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatFabButton, RouterLink, MatIcon],
})
export class OrderCreateComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
