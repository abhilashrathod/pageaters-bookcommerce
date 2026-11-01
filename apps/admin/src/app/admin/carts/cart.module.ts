import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';

import { EntityTableModule } from '@components/entity-table/entity-table.module';
import { CartRoutingModule } from './cart-routing.module';

import { CartListComponent } from './list/cart-list.component';
import { CartViewComponent } from './view/cart-view.component';

@NgModule({
  imports: [CommonModule, EntityTableModule, CartRoutingModule, CartListComponent, CartViewComponent],
  exports: [],
  providers: [],
})
export class CartModule {}
