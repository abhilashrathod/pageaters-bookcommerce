import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { EntityTableComponent } from '@components/entity-table/entity-table-component';

@Component({
  selector: 'app-customer-list',
  templateUrl: 'customer-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EntityTableComponent],
})
export class CustomerListComponent implements OnInit {
  public editResourceUrl: string[] = ['/', 'admin', 'customers', 'update'];

  public createResourceUrl: string[] = ['/', 'admin', 'customers', 'create'];

  public viewResourceUrl: string[] = ['/', 'admin', 'customers', 'view'];

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
  public searchResource = '/users/search';

  constructor() {}

  ngOnInit(): void {}
}
