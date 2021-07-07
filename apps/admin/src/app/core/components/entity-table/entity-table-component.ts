import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';

import {merge, of} from 'rxjs';
import {catchError, map, startWith, switchMap, tap} from 'rxjs/operators';

import {SharedService} from '../../services/shared.service';

import {IPaginationResponse} from '../../schema/responses';


@Component({
  selector: 'app-entity-table',
  templateUrl: 'entity-table-component.html'
})

export class EntityTableComponent implements OnInit, AfterViewInit {

  // inputs
  @Input('columns') public columns;
  @Input('getResource') public getResource;
  @Input('editResource') public editResource;
  @Input('deleteResource') public deleteResource;
  @Input('statusResource') public statusResource;
  @Input('checkResource') public checkResource;
  @Input('featuredResource') public featuredResource;
  @Input('sort') public sort;

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;

  // events
  // tslint:disable-next-line:no-output-on-prefix
  @Output() onEmptyRecords = new EventEmitter<any>();

  dataSource = new MatTableDataSource();
  filterObject: any = {
    limit: 25,
    page: 1,
  };
  total: number;
  page: any;
  displayedColumns: any;

  constructor(private sharedService: SharedService) {

  }

  ngOnInit(): void {
    this.displayedColumns = this.columns.map(c => c.columnDef);
  }

  ngAfterViewInit(): void {
    merge(this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          return this.sharedService.getAll(this.getResource, this.filterObject);
        }),
        map((responseData: IPaginationResponse) => {
          this.total = responseData.totalDocs;
          return responseData.docs;
        }),
        catchError((err) => of([]))
      ).subscribe(data => this.dataSource.data = data);
  }

  onPageChange(event): void {
    this.filterObject.limit = event.pageSize;
    this.filterObject.offset = this.filterObject.limit * event.pageIndex;
    this.page = event.pageIndex;
  }

  deleteRecord(row): void {
    // const id = row.pop();
    // const confirm = this.confirm.confirm('Warning!', 'Are you sure you want to delete this record');
    // confirm.subscribe(res => {
    //   if (res) {
    //     const delete$ = this.rest.remove(this.deleteResource + id);
    //     this.loading.open();
    //     delete$.subscribe(() => {
    //       this.loading.close();
    //       this.message.open('Record deleted', 'OKAY', {duration: 3000});
    //       this.ngAfterViewInit();
    //     }, err => {
    //       this.loading.close();
    //       this.message.open(err.message.toString(), 'OKAY', {duration: 5000});
    //     });
    //   }
    // });
  }
}
