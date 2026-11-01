import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { EntityTableComponent } from '@components/entity-table/entity-table-component';
import { MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-sets',
  templateUrl: 'sets.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EntityTableComponent, MatFabButton, RouterLink, MatIcon],
})
export class SetsComponent implements OnInit {
  public editResourceUrl: string[] = ['/', 'admin', 'sets', 'update'];

  public createResourceUrl: string[] = ['/', 'admin', 'sets', 'create'];

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

  constructor() {}

  ngOnInit() {}
}
