import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-subscribers',
  templateUrl: 'subscribers.component.html'
})

export class SubscribersComponent implements OnInit {
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
      header: 'Email',
      columnDef: 'email',
      cell: (element) => `${element.email}`,
    }
  ];

  public deleteBaseUrl = `/users`;
  public getAllBaseUrl = '/subscribers';


  constructor() {
  }

  ngOnInit() {
  }
}
