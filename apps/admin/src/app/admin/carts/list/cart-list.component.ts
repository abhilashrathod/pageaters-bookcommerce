import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-cart-list',
  templateUrl: 'cart-list.component.html'
})

export class CartListComponent implements OnInit {

  public editResourceUrl: string[] = [
    '/',
    'admin',
    'customers',
    'update',
  ];

  public createResourceUrl: string[] = [
    '/',
    'admin',
    'customers',
    'create',
  ];

  resourceColumns = [
    {
      header: 'Name',
      columnDef: 'fullName',
      cell: (element) => `${element.user ? element.user.fullName : 'No User Name'}, ${element.user ? element.user.email : 'No Email'}`,
    },
    {
      header: 'Products',
      columnDef: 'products',
      cell: (element) => `${element.products.length}`,
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/users`;
  public getAllBaseUrl = '/cart';

  constructor() {
  }

  ngOnInit(): void {
  }
}
