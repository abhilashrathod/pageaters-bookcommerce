import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';

import { EntityTableModule } from '@components/entity-table/entity-table.module';

import { BooksRoutingModule } from './books-routing.module';

import { BooksListComponent } from './list/books-list.component';
import { BookUpdateComponent } from './update/book-update.component';
import { BookCreateComponent } from './create/book-create.component';
import { BookViewComponent } from './view/book-view.component';

@NgModule({
  imports: [
    CommonModule,
    EntityTableModule,
    FormsModule,
    ReactiveFormsModule,
    AngularMultiSelectModule,
    BooksRoutingModule,
    BooksListComponent,
    BookCreateComponent,
    BookUpdateComponent,
    BookViewComponent,
  ],
  exports: [],
  providers: [],
})
export class BooksModule {}
