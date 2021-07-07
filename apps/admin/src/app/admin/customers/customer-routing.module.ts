import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {CustomerListComponent} from './list/customer-list.component';
import {CustomerCreateComponent} from './create/customer-create.component';
import {CustomerUpdateComponent} from './update/customer-update.component';


const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: CustomerListComponent},
  {path: 'create', component: CustomerCreateComponent},
  {path: 'update/:id', component: CustomerUpdateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule {
}
