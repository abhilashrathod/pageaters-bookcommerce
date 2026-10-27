import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CKEditorModule} from '@ckeditor/ckeditor5-angular';
import {SortablejsModule} from 'ngx-sortablejs';
import {AngularMultiSelectModule} from 'angular2-multiselect-dropdown';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {SharedModule} from '../../core/shared/shared.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';
import {StoreRoutingModule} from './store-routing.module';

import {DashboardComponent} from './dashboard/dashboard.component';
import {DealsComponent} from './deals/deals.component';
import {AddDealComponent} from './deals/create/add-deal.component';
import {UpdateDealComponent} from './deals/update/update-deal.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    AngularMultiSelectModule,
    EntityTableModule,
    StoreRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CKEditorModule,
    SortablejsModule,
  ],
  exports: [],
  declarations: [
    DashboardComponent,
    DealsComponent,
    AddDealComponent,
    UpdateDealComponent
  ],
  providers: [],
})
export class StoreModule {
}
