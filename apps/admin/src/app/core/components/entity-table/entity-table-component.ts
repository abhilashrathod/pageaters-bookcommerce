import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';

import {merge, of} from 'rxjs';
import {catchError, debounceTime, map, startWith, switchMap} from 'rxjs/operators';

import {SharedService} from '../../services/shared.service';

import {IPaginationResponse} from '../../schema/responses';
import {FormControl} from '@angular/forms';
import {AppConfirmService} from '../app-confirm/app-confirm.service';
import {AppLoaderService} from '../app-loader/app-loader.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import { ORDER_STATUS } from '../../helpers/constants';


@Component({
  selector: 'app-entity-table',
  templateUrl: 'entity-table-component.html',
  styleUrls: ['./entity-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class EntityTableComponent implements OnInit, AfterViewInit, OnChanges {

  search = new FormControl();

  // inputs
  @Input() public columns;
  @Input() public getResource;
  @Input() public editResource;
  @Input() public viewResource;
  @Input() public searchResource;
  @Input() public deleteResource;
  @Input() public statusResource;
  @Input() public checkResource;
  @Input() public featuredResource;
  @Input() public sort;
  @Input() public showFilters = false;

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;

  // events
  // tslint:disable-next-line:no-output-on-prefix
  @Output() onEmptyRecords = new EventEmitter<any>();

  // orders list only
  statuses = ORDER_STATUS;

  dataSource = new MatTableDataSource();
  public filterObject = {
    limit: 25,
    page: 1,
    sortBy: 'createdAt',
    sortOrder: -1,
    status: '',
  };
  total: number;
  page: any;
  displayedColumns: any;

  constructor(private sharedService: SharedService,
              private loading: AppLoaderService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private snack: MatSnackBar,
              private confirm: AppConfirmService) {

  }

  ngOnInit(): void {
    const params$ = this.activatedRoute.queryParams;
    this.displayedColumns = this.columns.map(c => c.columnDef);
    params$.subscribe((queryParams) => {
      if (queryParams.page) {
        this.filterObject.page = queryParams.page;
      }
      if (queryParams.limit) {
        this.filterObject.limit = queryParams.limit;
      }
    });

    this.search
      .valueChanges
      .pipe(
        debounceTime(750),
      )
      .subscribe((text) => {
        if (text) {
          this.searchTable(text);
        } else {
          this.ngAfterViewInit();
        }
      });
  }


  ngOnChanges(changes: SimpleChanges): void {
  }

  handleFilterChange($event): void {
    const value = $event.value;
    this.filterObject.status = value;
    this.ngAfterViewInit();
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
          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: this.filterObject,
            replaceUrl: true,
            queryParamsHandling: 'merge'
          });
          return responseData.docs;
        }),
        catchError((err) => of([]))
      ).subscribe(data => this.dataSource.data = data);
  }

  searchTable(query): void {
    this.sharedService.search(this.searchResource, query)
      .subscribe(data => this.dataSource.data = data);
  }

  onPageChange(event): void {
    this.filterObject.limit = event.pageSize;
    this.filterObject.page = event.pageIndex + 1;
  }

  deleteRecord(row): void {
    const id = row.pop();
    const confirm = this.confirm.confirm('Warning!', 'Are you sure you want to delete this record');
    confirm.subscribe(res => {
      if (res) {
        const delete$ = this.sharedService.destroy(this.deleteResource, id);
        this.loading.open();
        delete$.subscribe(() => {
          this.loading.close();
          this.snack.open('Record deleted', 'OKAY', {duration: 3000});
          this.ngAfterViewInit();
        }, err => {
          this.loading.close();
          this.snack.open(err.message.toString(), 'OKAY', {duration: 5000});
        });
      }
    });
  }
}
