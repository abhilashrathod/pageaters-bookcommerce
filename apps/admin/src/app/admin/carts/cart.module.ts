import {NgModule} from '@angular/core';

import {CommonModule} from '@angular/common';
import {SharedModule} from '@core/shared/shared.module';
import {EntityTableModule} from '@components/entity-table/entity-table.module';
import {CartRoutingModule} from './cart-routing.module';

import {CartListComponent} from './list/cart-list.component';
import { CartViewComponent } from './view/cart-view.component';


@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    EntityTableModule,
    CartRoutingModule,
  ],
  exports: [],
  declarations: [
    CartListComponent,
    CartViewComponent
  ],
  providers: [],
})
export class CartModule {
}
