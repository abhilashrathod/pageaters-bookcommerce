import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';

import { AuthorRoutingModule } from './author-routing.module';

import { AuthorListComponent } from './list/author-list.component';
import { AuthorCreateComponent } from './create/author-create.component';
import { AuthorUpdateComponent } from './update/author-update.component';
import { EntityTableModule } from '@components/entity-table/entity-table.module';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    EntityTableModule,
    AuthorRoutingModule,
    AngularMultiSelectModule,
    ReactiveFormsModule,
    AuthorListComponent,
    AuthorCreateComponent,
    AuthorUpdateComponent,
  ],
  exports: [],
  providers: [],
})
export class AuthorModule {}
