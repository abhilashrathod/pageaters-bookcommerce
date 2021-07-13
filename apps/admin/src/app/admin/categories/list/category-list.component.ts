import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-category-list',
  templateUrl: 'category-list.component.html'
})

export class CategoryListComponent implements OnInit {

  public editResourceUrl: string[] = [
    '/',
    'admin',
    'categories',
    'update',
  ];

  public createResourceUrl: string[] = [
    '/',
    'admin',
    'categories',
    'create',
  ];

  resourceColumns = [
    {
      header: 'Title',
      columnDef: 'title',
      cell: (element) => `${element.title}`,
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/categories`;
  public getAllBaseUrl = '/categories';
  public searchBaseUrl = '/categories/search';

  constructor() {
  }

  ngOnInit(): void {
  }
}
