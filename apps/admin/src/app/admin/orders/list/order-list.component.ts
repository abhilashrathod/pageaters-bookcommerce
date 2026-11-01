import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import moment from 'moment';

@Component({
  selector: 'app-order-list',
  templateUrl: 'order-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class OrderListComponent implements OnInit {
  public editResourceUrl: string[] = ['/', 'admin', 'orders', 'update'];

  public viewResourceUrl: string[] = ['/', 'admin', 'orders', 'view'];

  public createResourceUrl: string[] = ['/', 'admin', 'orders', 'create'];

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
      cell: (element) => `${moment(element.orderDate).format('DD/MM/YY, ddd, hh:mm')}`,
    },
    {
      header: 'Status',
      columnDef: 'status',
      cell: (element) => `${element.orderStatus}`,
    },
    {
      header: 'Products',
      columnDef: 'products',
      cell: (element) => this.returnProductItems(element.products, element.bundles, element.boxes, element.addOns),
    },
    {
      header: 'Total',
      columnDef: 'orderTotal',
      cell: (element) => `INR ${element.total}`,
    },
    {
      header: 'Customer',
      columnDef: 'customer',
      cell: (element) => `<strong>${element.userId.fullName}</strong><br/><p>${element.userId.email}<br/>${element.userId.contactNo}</p>`,
    },
    {
      header: 'View Details',
      columnDef: 'view',
      cell: (element) => [...this.viewResourceUrl, element._id],
    },
  ];

  public getAllBaseUrl = `/orders`;
  public searchResourceUrl = `/orders/search`;

  constructor() {}

  ngOnInit(): void {}

  returnProductItems(products, bundles, boxes, addOns): string {
    const books = products.map((x) => x.product.title + ' x ' + x.quantity);
    const bundle = bundles.map((x) => x.bundle.title + ' x ' + x.quantity);
    const box = boxes.map((x) => x.box.title + ' x ' + x.quantity);
    const addOn = addOns.map((x) => x.addOn.name + ' x ' + x.quantity);
    return `${books.join(`<br />`)} <br/> ${bundle.join(`<br />`)} <br/> ${box.join(`<br />`)} <br/> ${addOn.join(`<br />`)}`;
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
