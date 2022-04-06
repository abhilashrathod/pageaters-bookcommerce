import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {OrderListComponent} from './list/order-list.component';
import {OrderCreateComponent} from './create/order-create.component';
import {OrderUpdateComponent} from './update/order-update.component';
import {OrderViewComponent} from './view/order-view.component';


const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: OrderListComponent},
  {path: 'create', component: OrderCreateComponent},
  {path: 'update/:id', component: OrderUpdateComponent},
  {path: 'view/:id', component: OrderViewComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrderRoutingModule {
}
