import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-sets',
  templateUrl: 'sets.component.html'
})

export class SetsComponent implements OnInit {
  public editResourceUrl: string[] = [
    '/',
    'admin',
    'sets',
    'update',
  ];

  public createResourceUrl: string[] = [
    '/',
    'admin',
    'sets',
    'create',
  ];

  public resourceColumns: any[] = [
    {
      header: 'Title',
      columnDef: 'title',
      cell: (element) => `${element.title}`,
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

  public deleteBaseUrl = `/product-sets`;
  public getAllBaseUrl = '/product-sets';

  constructor() {
  }

  ngOnInit() {
  }
}
