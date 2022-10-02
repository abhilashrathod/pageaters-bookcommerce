import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-customer-list',
  templateUrl: 'customer-list.component.html'
})

export class CustomerListComponent implements OnInit {

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

  public viewResourceUrl: string[] = [
    '/',
    'admin',
    'customers',
    'view',
  ];

  resourceColumns = [
    {
      header: 'Name',
      columnDef: 'fullName',
      cell: (element) => `${element.fullName}`,
    },
    {
      header: 'Email',
      columnDef: 'email',
      cell: (element) => `${element.email}`,
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

  public deleteBaseUrl = `/users`;
  public getAllBaseUrl = '/users';

  constructor() {
  }

  ngOnInit(): void {
  }
}
