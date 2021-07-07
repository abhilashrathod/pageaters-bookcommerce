import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '../../core/shared/shared.module';

import {AuthorRoutingModule} from './author-routing.module';

import {AuthorListComponent} from './list/author-list.component';
import {AuthorCreateComponent} from './create/author-create.component';
import {AuthorUpdateComponent} from './update/author-update.component';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    EntityTableModule,
    AuthorRoutingModule
  ],
  exports: [],
  declarations: [
    AuthorListComponent,
    AuthorCreateComponent,
    AuthorUpdateComponent,
  ],
  providers: [],
})
export class AuthorModule {
}
