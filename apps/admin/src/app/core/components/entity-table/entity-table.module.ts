import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';

import {EntityTableComponent} from './entity-table-component';
import {SharedModule} from '@core/shared/shared.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AppConfirmModule} from '@components/app-confirm/app-confirm.module';
import {AppLoaderModule} from '@components/app-loader/app-loader.module';


@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    AppConfirmModule,
    AppLoaderModule,
  ],
  declarations: [EntityTableComponent],
  exports: [EntityTableComponent]
})
export class EntityTableModule {
}
