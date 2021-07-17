import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: 'sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})

export class SidebarComponent implements OnInit {

  menuItems = [
    {
      icon: 'dashboard',
      path: ['/', 'admin', 'dashboard'],
      title: 'Dashboard'
    },
    {
      icon: 'book',
      path: ['/', 'admin', 'books'],
      title: 'Books'
    },
    {
      icon: 'group_work',
      path: ['/', 'admin', 'bundles'],
      title: 'Bundles'
    },
    {
      icon: 'brush',
      path: ['/', 'admin', 'authors'],
      title: 'Authors',
    },
    {
      icon: 'auto_awesome_motion',
      path: ['/', 'admin', 'categories'],
      title: 'Categories'
    },
    {
      icon: 'collections',
      path: ['/', 'admin', 'collections'],
      title: 'Collections'
    },
    {
      icon: 'person',
      path: ['/', 'admin', 'customers'],
      title: 'Customers'
    },
    {
      icon: 'shopping_cart',
      path: [],
      title: 'Orders'
    },
    {
      icon: 'assignment_return',
      path: [],
      title: 'Refunds'
    },
    {
      icon: 'paid',
      path: [],
      title: 'Discounts'
    },
    {
      icon: 'savings',
      path: [],
      title: 'Bundles'
    },
    {
      icon: 'star',
      path: [],
      title: 'Reviews'
    },
    {
      icon: 'store',
      path: [],
      title: 'Store'
    },

  ];

  constructor() {
  }

  ngOnInit() {
  }
}
