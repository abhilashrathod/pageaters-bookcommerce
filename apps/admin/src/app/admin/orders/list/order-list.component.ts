import {Component, OnInit} from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'app-order-list',
  templateUrl: 'order-list.component.html'
})

export class OrderListComponent implements OnInit {

  public editResourceUrl: string[] = [
    '/',
    'admin',
    'orders',
    'update',
  ];

  public viewResourceUrl: string[] = [
    '/',
    'admin',
    'orders',
    'view',
  ];

  public createResourceUrl: string[] = [
    '/',
    'admin',
    'orders',
    'create',
  ];

  viewOrderStatus = '';

  resourceColumns = [
    {
      header: 'Order ID',
      columnDef: 'orderId',
      cell: (element) => `<strong>${element.orderId}</strong>`,
    },
    {
      header: 'Order Date',
      columnDef: 'orderDate',
      cell: (element) => `${moment(element.orderDate).format('DD MMM YYYY, ddd, hh:mm')}`,
    },
    {
      header: 'Status',
      columnDef: 'status',
      cell: (element) => `${element.orderStatus}`,
    },
    {
      header: 'Products',
      columnDef: 'products',
      cell: (element) => this.returnProductItems(element.products, element.bundles, element.boxes),
    },
    {
      header: 'Customer',
      columnDef: 'customer',
      cell: (element) => `<strong>${element.userId.fullName}</strong><br/><p>${element.userId.contactNo} | ${element.userId.email}</p>`,
    },
    {
      header: 'View Details',
      columnDef: 'view',
      cell: (element) => [...this.viewResourceUrl, element._id],
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/orders`;
  public getAllBaseUrl = `/orders`;

  constructor() {
  }

  ngOnInit(): void {
  }

  returnProductItems(products, bundles, boxes): string {
    const books = products.map((x) => x.product.title);
    const bundle = bundles.map((x) => x.bundle.title);
    const box = boxes.map((x) => x.box.title);
    return `${books.join(`<br />`)} <br/> ${bundle.join(`<br />`)} <br/> ${box.join(`<br />`)}`;
  }

  handleOrderStatusChange(event: any): void {
    switch (event.value) {
      case 'all':
        this.viewOrderStatus = event.value;
        this.getAllBaseUrl = this.getAllBaseUrl.concat('');
        break;
      case 'new':
        this.viewOrderStatus = event.value;
        this.getAllBaseUrl = this.getAllBaseUrl.concat('?status=paid&status=confirmed');
        break;

      case 'shipped':
        this.viewOrderStatus = event.value;
        this.getAllBaseUrl = this.getAllBaseUrl.concat('?status=shipped');
        break;

      case 'fulfilled':
        this.viewOrderStatus = event.value;
        this.getAllBaseUrl = this.getAllBaseUrl.concat('?status=fulfilled');
        break;

      case 'cancelled':
        this.viewOrderStatus = event.value;
        this.getAllBaseUrl = this.getAllBaseUrl.concat('?status=cancelled');
        break;
    }
  }
}
