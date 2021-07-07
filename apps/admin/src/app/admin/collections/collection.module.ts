import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../core/shared/shared.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';
import {CollectionRoutingModule} from './collection-routing.module';

import {CollectionListComponent} from './list/collection-list.component';
import {CollectionCreateComponent} from './create/collection-create.component';
import {CollectionUpdateComponent} from './update/collection-update.component';

@NgModule({
  imports: [
    CommonModule,
    CollectionRoutingModule,
    SharedModule,
    EntityTableModule,
  ],
  exports: [],
  declarations: [
    CollectionCreateComponent,
    CollectionListComponent,
    CollectionUpdateComponent,
  ],
  providers: [],
})
export class CollectionModule {
}
