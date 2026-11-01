import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { EntityTableComponent } from '@components/entity-table/entity-table-component';
import { MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-category-list',
  templateUrl: 'category-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EntityTableComponent, MatFabButton, RouterLink, MatIcon],
})
export class CategoryListComponent implements OnInit {
  public editResourceUrl: string[] = ['/', 'admin', 'categories', 'update'];

  public createResourceUrl: string[] = ['/', 'admin', 'categories', 'create'];

  resourceColumns = [
    {
      header: 'Title',
      columnDef: 'title',
      cell: (element) => `${element.title}`,
    },
    {
      header: 'Numer of Books',
      columnDef: 'numberOfBooks',
      cell: (element) => `${element.numberOfBooks}`,
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

  constructor() {}

  ngOnInit(): void {}
}
