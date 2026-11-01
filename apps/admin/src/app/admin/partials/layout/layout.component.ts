import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';

@Component({
  templateUrl: 'layout.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
})
export class LayoutComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
