import {NgModule} from '@angular/core';

import {CommonModule} from '@angular/common';
import {SharedModule} from '../../core/shared/shared.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';
import {CustomerRoutingModule} from './customer-routing.module';

import {CustomerListComponent} from './list/customer-list.component';
import {CustomerCreateComponent} from './create/customer-create.component';
import {CustomerUpdateComponent} from './update/customer-update.component';
import {ViewCustomerComponent} from './view/view-customer.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    EntityTableModule,
    CustomerRoutingModule,
  ],
  exports: [],
  declarations: [
    CustomerListComponent,
    CustomerCreateComponent,
    CustomerUpdateComponent,
    ViewCustomerComponent,
  ],
  providers: [],
})
export class CustomerModule {
}
