import {Component, OnInit} from '@angular/core';
import { Router } from '@angular/router';
import {get} from 'lodash';

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

  public viewResourceUrl: string[] = [
    '/',
    'admin',
    'books',
    'view',
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
      columnDef: 'title',
      cell: (element) => `${element.title}`,
    },
    {
      header: 'Author',
      columnDef: 'author',
      cell: (element) => `${get(element, 'author.name', 'No Author Assigned')}`,
    },
    {
      header: 'Qty',
      columnDef: 'inventory',
      cell: (element) => `${element.inventory}`,
    },
    {
      header: 'MRP',
      columnDef: 'price',
      cell: (element) => `${element.price}`,
    },
    {
      header: 'Current Discount',
      columnDef: 'discount',
      cell: (element) => `${element.currentDiscount}`,
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

  public deleteBaseUrl = `/store-books`;
  public getAllBaseUrl = '/store-books';
  public searchBaseUrl = '/store-books/search';

  constructor(private router: Router) {
  }

  ngOnInit(): void {
  }
}
