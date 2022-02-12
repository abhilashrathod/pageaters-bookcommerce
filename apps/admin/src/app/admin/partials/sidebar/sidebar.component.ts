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
      icon: 'savings',
      path: ['/', 'admin', 'bundles'],
      title: 'Bundles'
    },
    {
      icon: 'person',
      path: ['/', 'admin', 'customers'],
      title: 'Customers'
    },
    {
      icon: 'shopping_bag',
      path: [],
      title: 'Orders'
    },
    {
      icon: 'shopping_cart',
      path: ['/', 'admin', 'carts'],
      title: 'Carts'
    },
    {
      icon: 'layers',
      path: ['/', 'admin', 'sets'],
      title: 'Product Sets'
    },
    {
      icon: 'paid',
      path: [],
      title: 'Discounts'
    },
    {
      icon: 'star',
      path: [],
      title: 'Reviews'
    },
    {
      icon: 'store',
      path: ['/', 'admin', 'store'],
      title: 'Store'
    },

  ];

  constructor() {
  }

  ngOnInit() {
  }
}
