import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {SharedModule} from '../../core/shared/shared.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';

import {BooksRoutingModule} from './books-routing.module';

import {BooksListComponent} from './list/books-list.component';
import {BookUpdateComponent} from './update/book-update.component';
import {BookCreateComponent} from './create/book-create.component';
import {AngularMultiSelectModule} from 'angular2-multiselect-dropdown';




@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    EntityTableModule,
    FormsModule,
    ReactiveFormsModule,
    AngularMultiSelectModule,
    BooksRoutingModule,
  ],
  exports: [],
  declarations: [
    BooksListComponent,
    BookCreateComponent,
    BookUpdateComponent,
  ],
  providers: [],
})
export class BooksModule {
}
