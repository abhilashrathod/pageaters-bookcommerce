import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EntityTableModule } from '@components/entity-table/entity-table.module';
import { CategoryRoutingModule } from './category-routing.module';
import { AppLoaderModule } from '@components/app-loader/app-loader.module';

import { CategoryListComponent } from './list/category-list.component';
import { CategoryCreateComponent } from './create/category-create.component';
import { CategoryUpdateComponent } from './update/category-update.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    EntityTableModule,
    CategoryRoutingModule,
    AppLoaderModule,
    CategoryListComponent,
    CategoryCreateComponent,
    CategoryUpdateComponent,
  ],
  exports: [],
  providers: [],
})
export class CategoryModule {}
