import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';

import {EntityTableComponent} from './entity-table-component';
import {SharedModule} from '../../shared/shared.module';


@NgModule({
  imports: [CommonModule, RouterModule, SharedModule],
  declarations: [EntityTableComponent],
  exports: [EntityTableComponent]
})
export class EntityTableModule {
}
