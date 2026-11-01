import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SortablejsModule} from '@dustfoundation/ngx-sortablejs';
import {AngularMultiSelectModule} from 'angular2-multiselect-dropdown';
import {SharedModule} from '@core/shared/shared.module';

import {BundlesRoutingModule} from './bundles-routing.module';
import {EntityTableModule} from '@components/entity-table/entity-table.module';
import {AppLoaderModule} from '@components/app-loader/app-loader.module';

import {BundleListComponent} from './list/bundle-list.component';
import {BundleCreateComponent} from './create/bundle-create.component';
import {BundleUpdateComponent} from './update/bundle-update.component';
import {BundleRearrangeComponent} from './rearrange/bundle-rearrange.component';



@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    EntityTableModule,
    AppLoaderModule,
    BundlesRoutingModule,
    AngularMultiSelectModule,
    SortablejsModule,
  ],
  exports: [],
  declarations: [
    BundleListComponent,
    BundleCreateComponent,
    BundleRearrangeComponent,
    BundleUpdateComponent,
  ],
  providers: [],
})
export class BundlesModule {
}
