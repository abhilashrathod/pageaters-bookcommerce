import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EntityTableModule } from '@components/entity-table/entity-table.module';
import { StoreRoutingModule } from './store-routing.module';

import { DashboardComponent } from './dashboard/dashboard.component';
import { DealsComponent } from './deals/deals.component';
import { AddDealComponent } from './deals/create/add-deal.component';
import { UpdateDealComponent } from './deals/update/update-deal.component';

@NgModule({
  imports: [
    CommonModule,
    AngularMultiSelectModule,
    EntityTableModule,
    StoreRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SortablejsModule,
    DashboardComponent,
    DealsComponent,
    AddDealComponent,
    UpdateDealComponent,
  ],
  exports: [],
  providers: [],
})
export class StoreModule {}
