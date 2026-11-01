import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';

import { EntityTableModule } from '@components/entity-table/entity-table.module';
import { ProductSetsRoutingModule } from './product-sets-routing.module';

import { SetsComponent } from './sets/sets.component';

import { CreateProductSetComponent } from './create/create-product-set.component';
import { UpdateProductSetComponent } from './update/update-product-set.component';

@NgModule({
  imports: [
    CommonModule,
    ProductSetsRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    EntityTableModule,
    SortablejsModule,
    AngularMultiSelectModule,
    SetsComponent,
    CreateProductSetComponent,
    UpdateProductSetComponent,
  ],
  exports: [],
  providers: [],
})
export class ProductSetsModule {}
