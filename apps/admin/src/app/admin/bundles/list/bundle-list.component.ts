import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { EntityTableComponent } from '@components/entity-table/entity-table-component';
import { MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-bundle-list',
  templateUrl: 'bundle-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EntityTableComponent, MatFabButton, RouterLink, MatIcon],
})
export class BundleListComponent implements OnInit {
  public editResourceUrl: string[] = ['/', 'admin', 'bundles', 'update'];

  public createResourceUrl: string[] = ['/', 'admin', 'bundles', 'create'];

  public resourceColumns: any[] = [
    {
      header: 'Title',
      columnDef: 'title',
      cell: (element) => `${element.title}`,
    },
    {
      header: 'Books',
      columnDef: 'bundledBooks',
      cell: (element) => `${element.bundledBooks.length}`,
    },
    {
      header: 'Priority',
      columnDef: 'priority',
      cell: (element) => `${element.priority}`,
    },
    {
      header: 'Discount (in %)',
      columnDef: 'currentDiscount',
      cell: (element) => `${element.currentDiscount}`,
    },
    {
      header: 'Prices (Retail | Member)',
      columnDef: 'prices',
      cell: (element) => `${element.price} | ${element.membersPrice}`,
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/bundles`;
  public getAllBaseUrl = '/bundles';
  public searchBaseUrl = '/bundles/search';

  constructor() {}

  ngOnInit() {}
}
