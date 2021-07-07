import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-collection-list',
  templateUrl: 'collection-list.component.html'
})

export class CollectionListComponent implements OnInit {
  public editResourceUrl: string[] = [
    '/',
    'admin',
    'collections',
    'update',
  ];

  public createResourceUrl: string[] = [
    '/',
    'admin',
    'collections',
    'create',
  ];

  resourceColumns = [
    {
      header: 'Name',
      columnDef: 'title',
      cell: (el) => `${el.title}`,
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

  constructor() {
  }

  ngOnInit() {
  }
}
