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

  resourceColumns = [
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
      cell: (element) => this.returnProductItems(element.products, element.bundles),
    },
    {
      header: 'Customer',
      columnDef: 'customer',
      cell: (element) => `<strong>${element.userId.fullName}</strong><br/><p>${element.userId.contactNo} | ${element.userId.email}</p>`,
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/users`;
  public getAllBaseUrl = '/orders';

  constructor() {
  }

  ngOnInit(): void {
  }

  returnProductItems(products, bundles): string {
    const books = products.map((x) => x.product.title);
    const bundle = bundles.map((x) => x.bundle.title);
    return `${books.join(`<br />`)} <br/> ${bundle.join(`<br />`)}`;
  }
}
