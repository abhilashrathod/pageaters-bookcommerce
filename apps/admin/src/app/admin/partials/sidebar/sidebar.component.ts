import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatList, MatListItem } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  templateUrl: 'sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatList, RouterLink, MatListItem, MatIcon],
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
      icon: 'layers',
      path: ['/', 'admin', 'sets'],
      title: 'Product Sets',
    },
    {
      icon: 'paid',
      path: [],
      title: 'Discounts',
    },
    {
      icon: 'star',
      path: [],
      title: 'Reviews',
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
