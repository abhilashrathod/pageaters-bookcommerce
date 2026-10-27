import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SortablejsModule} from 'ngx-sortablejs';
import {AngularMultiSelectModule} from 'angular2-multiselect-dropdown';

import {SharedModule} from '../../core/shared/shared.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';
import {ProductSetsRoutingModule} from './product-sets-routing.module';

import {SetsComponent} from './sets/sets.component';

import {CreateProductSetComponent} from './create/create-product-set.component';
import {UpdateProductSetComponent} from './update/update-product-set.component';


@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    ProductSetsRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    EntityTableModule,
    SortablejsModule,
    AngularMultiSelectModule,
  ],
  exports: [],
  declarations: [
    SetsComponent,
    CreateProductSetComponent,
    UpdateProductSetComponent
  ],
  providers: [],
})
export class ProductSetsModule {
}
