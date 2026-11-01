import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { EntityTableComponent } from '@components/entity-table/entity-table-component';
import { MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-collection-list',
  templateUrl: 'collection-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EntityTableComponent, MatFabButton, RouterLink, MatIcon],
})
export class CollectionListComponent implements OnInit {
  public editResourceUrl: string[] = ['/', 'admin', 'collections', 'update'];

  public createResourceUrl: string[] = ['/', 'admin', 'collections', 'create'];

  resourceColumns = [
    {
      header: 'Name',
      columnDef: 'title',
      cell: (el) => `${el.title}`,
    },
    {
      header: 'Priority',
      columnDef: 'priority',
      cell: (el) => `${el.priority}`,
    },
    {
      header: 'Tags',
      columnDef: 'tags',
      cell: (el) => `${el.tags.join(', ')}`,
    },
    {
      header: 'Action',
      columnDef: 'action',
      cell: (element) => [...this.editResourceUrl, element._id],
    },
  ];

  public deleteBaseUrl = `/collections`;
  public getAllBaseUrl = '/collections';
  public searchBaseUrl = '/collections/search';

  constructor() {}

  ngOnInit() {}
}
