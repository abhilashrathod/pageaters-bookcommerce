import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {AngularMultiSelectModule} from 'angular2-multiselect-dropdown';
import {SharedModule} from '../../core/shared/shared.module';
import {BundlesRoutingModule} from './bundles-routing.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';
import {AppLoaderModule} from '../../core/components/app-loader/app-loader.module';

import {BundleListComponent} from './list/bundle-list.component';
import {BundleCreateComponent} from './create/bundle-create.component';
import {BundleUpdateComponent} from './update/bundle-update.component';


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
  ],
  exports: [],
  declarations: [
    BundleListComponent,
    BundleCreateComponent,
    BundleUpdateComponent,
  ],
  providers: [],
})
export class BundlesModule {
}
