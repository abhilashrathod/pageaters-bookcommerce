import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {CategoryListComponent} from './list/category-list.component';
import {CategoryCreateComponent} from './create/category-create.component';
import {CategoryUpdateComponent} from './update/category-update.component';

const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: CategoryListComponent},
  {path: 'create', component: CategoryCreateComponent},
  {path: 'update/:id', component: CategoryUpdateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoryRoutingModule {
}
