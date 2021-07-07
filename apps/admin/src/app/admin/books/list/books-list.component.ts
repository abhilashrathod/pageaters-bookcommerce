import {Component, OnInit} from '@angular/core';


@Component({
  selector: 'app-books-list',
  templateUrl: 'books-list.component.html'
})

export class BooksListComponent implements OnInit {

  public editResourceUrl: string[] = [
    '/',
    'admin',
    'books',
    'update',
  ];

  public createResourceUrl: string[] = [
    '/',
    'admin',
    'books',
    'create',
  ];

  public resourceColumns: any[] = [
    {
      header: 'Title',
      columnDef: 'author',
      cell: (element) => `${element.title}`,
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/store-books`;
  public getAllBaseUrl = '/store-books';

  constructor() {
  }

  ngOnInit(): void {
  }
}
