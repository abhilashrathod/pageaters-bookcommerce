import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EntityTableModule } from '@components/entity-table/entity-table.module';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';

import { CollectionRoutingModule } from './collection-routing.module';

import { CollectionListComponent } from './list/collection-list.component';
import { CollectionCreateComponent } from './create/collection-create.component';
import { CollectionUpdateComponent } from './update/collection-update.component';

@NgModule({
  imports: [
    CommonModule,
    CollectionRoutingModule,
    EntityTableModule,
    FormsModule,
    ReactiveFormsModule,
    AngularMultiSelectModule,
    CollectionCreateComponent,
    CollectionListComponent,
    CollectionUpdateComponent,
  ],
  exports: [],
  providers: [],
})
export class CollectionModule {}
