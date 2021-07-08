import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-author-list',
  templateUrl: 'author-list.component.html'
})

export class AuthorListComponent implements OnInit {
  public editResourceUrl: string[] = [
    '/',
    'admin',
    'authors',
    'update',
  ];

  public createResourceUrl: string[] = [
    '/',
    'admin',
    'authors',
    'create',
  ];

  resourceColumns = [
    {
      header: 'Name',
      columnDef: 'name',
      cell: (element) => `${element.name}`,
    },
    {
      header: 'Number of Books',
      columnDef: 'books',
      cell: (element) => `${element.books.length}`,
    },
    {
      header: 'Popularity',
      columnDef: 'popularity',
      cell: (element) => `${element.popularity}`,
    },
    {
      header: 'Deleted',
      columnDef: 'isDeleted',
      cell: (el) => el.isDeleted ? `${new Date(el.deletedAt).toDateString()}` : '',
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/authors`;
  public getAllBaseUrl = '/authors';
  public searchBaseUrl = '/authors/search';

  constructor() {
  }

  ngOnInit(): void {
  }
}
