import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {CartListComponent} from './list/cart-list.component';


const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: CartListComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CartRoutingModule {
}
