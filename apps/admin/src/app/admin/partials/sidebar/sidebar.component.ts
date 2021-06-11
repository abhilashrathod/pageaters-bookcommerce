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
      path: [],
      title: 'Dashboard'
    },
    {
      icon: 'book',
      path: [],
      title: 'Books'
    },
    {
      icon: 'brush',
      path: [],
      title: 'Authors'
    },
    {
      icon: 'auto_awesome_motion',
      path: [],
      title: 'Categories'
    },
    {
      icon: 'collections',
      path: [],
      title: 'Collections'
    },
    {
      icon: 'person',
      path: [],
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
