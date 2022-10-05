import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {CartListComponent} from './list/cart-list.component';
import {CartViewComponent} from './view/cart-view.component';

const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: CartListComponent},
  {path: 'view/:id', component: CartViewComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CartRoutingModule {
}
