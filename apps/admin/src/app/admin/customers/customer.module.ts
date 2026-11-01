import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';

import { EntityTableModule } from '@components/entity-table/entity-table.module';
import { CustomerRoutingModule } from './customer-routing.module';

import { CustomerListComponent } from './list/customer-list.component';
import { CustomerCreateComponent } from './create/customer-create.component';
import { CustomerUpdateComponent } from './update/customer-update.component';
import { ViewCustomerComponent } from './view/view-customer.component';

@NgModule({
  imports: [
    CommonModule,
    EntityTableModule,
    CustomerRoutingModule,
    CustomerListComponent,
    CustomerCreateComponent,
    CustomerUpdateComponent,
    ViewCustomerComponent,
  ],
  exports: [],
  providers: [],
})
export class CustomerModule {}
