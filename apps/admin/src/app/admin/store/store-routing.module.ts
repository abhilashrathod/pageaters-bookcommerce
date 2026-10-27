import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {DashboardComponent} from './dashboard/dashboard.component';
import {DealsComponent} from './deals/deals.component';
import {AddDealComponent} from './deals/create/add-deal.component';
import {UpdateDealComponent} from './deals/update/update-deal.component';


const routes: Routes = [
  {path: '', redirectTo: 'dash', pathMatch: 'full'},
  {path: 'dash', component: DashboardComponent},
  {
    path: 'deals',
    children: [
      {path: '', redirectTo: 'list', pathMatch: 'full'},
      {path: 'list', component: DealsComponent},
      {path: 'create', component: AddDealComponent},
      {path: 'update/:id', component: UpdateDealComponent},
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoreRoutingModule {
}
