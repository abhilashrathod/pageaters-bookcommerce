import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {BundleListComponent} from './list/bundle-list.component';
import {BundleCreateComponent} from './create/bundle-create.component';
import {BundleUpdateComponent} from './update/bundle-update.component';


const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: BundleListComponent},
  {path: 'create', component: BundleCreateComponent},
  {path: 'update/:id', component: BundleUpdateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BundlesRoutingModule {
}
