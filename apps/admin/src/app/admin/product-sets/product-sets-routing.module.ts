import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {SetsComponent} from './sets/sets.component';
import {CreateProductSetComponent} from './create/create-product-set.component';
import {UpdateProductSetComponent} from './update/update-product-set.component';

const routes: Routes = [
  {path: '', component: SetsComponent},
  {path: 'create', component: CreateProductSetComponent},
  {path: 'update/:id', component: UpdateProductSetComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductSetsRoutingModule {
}
