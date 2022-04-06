import {NgModule} from '@angular/core';

import {CommonModule} from '@angular/common';
import {SharedModule} from '../../core/shared/shared.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';
import {OrderRoutingModule} from './order-routing.module';

import {OrderListComponent} from './list/order-list.component';
import {OrderCreateComponent} from './create/order-create.component';
import {OrderUpdateComponent} from './update/order-update.component';
import {OrderViewComponent} from './view/order-view.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    EntityTableModule,
    OrderRoutingModule,
  ],
  exports: [],
  declarations: [
    OrderListComponent,
    OrderCreateComponent,
    OrderUpdateComponent,
    OrderViewComponent,
  ],
  providers: [],
})
export class OrderModule {
}
