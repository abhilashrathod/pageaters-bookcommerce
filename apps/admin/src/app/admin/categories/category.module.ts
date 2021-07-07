import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../core/shared/shared.module';
import {EntityTableModule} from '../../core/components/entity-table/entity-table.module';
import {CategoryRoutingModule} from './category-routing.module';

import {CategoryListComponent} from './list/category-list.component';
import {CategoryCreateComponent} from './create/category-create.component';
import {CategoryUpdateComponent} from './update/category-update.component';

@NgModule({
  imports: [CommonModule, SharedModule, EntityTableModule, CategoryRoutingModule],
  exports: [],
  declarations: [
    CategoryListComponent,
    CategoryCreateComponent,
    CategoryUpdateComponent,
  ],
  providers: [],
})
export class CategoryModule {
}
