import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  templateUrl: 'sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, RouterLinkActive, MatIcon],
})
export class SidebarComponent implements OnInit {
  menuItems = [
    {
      icon: 'dashboard',
      path: ['/', 'admin', 'dashboard'],
      title: 'Dashboard',
    },
    {
      icon: 'book',
      path: ['/', 'admin', 'books'],
      title: 'Books',
    },
    {
      icon: 'group_work',
      path: ['/', 'admin', 'bundles'],
      title: 'Bundles',
    },
    {
      icon: 'brush',
      path: ['/', 'admin', 'authors'],
      title: 'Authors',
    },
    {
      icon: 'auto_awesome_motion',
      path: ['/', 'admin', 'categories'],
      title: 'Categories',
    },
    {
      icon: 'collections',
      path: ['/', 'admin', 'collections'],
      title: 'Collections',
    },
    {
      icon: 'person',
      path: ['/', 'admin', 'customers'],
      title: 'Customers',
    },
    {
      icon: 'shopping_bag',
      path: ['/', 'admin', 'orders'],
      title: 'Orders',
    },
    {
      icon: 'shopping_cart',
      path: ['/', 'admin', 'carts'],
      title: 'Carts',
    },
    {
      icon: 'outbox',
      path: ['/', 'admin', 'outbox'],
      title: 'Outbox',
    },
    {
      icon: 'layers',
      path: ['/', 'admin', 'sets'],
      title: 'Product Sets',
    },
    {
      icon: 'store',
      path: ['/', 'admin', 'store'],
      title: 'Store',
    },
  ];

  constructor() {}

  ngOnInit() {}
}
