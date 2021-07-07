import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {CollectionCreateComponent} from './create/collection-create.component';
import {CollectionListComponent} from './list/collection-list.component';
import {CollectionUpdateComponent} from './update/collection-update.component';


const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: CollectionListComponent},
  {path: 'create', component: CollectionCreateComponent},
  {path: 'update/:id', component: CollectionUpdateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CollectionRoutingModule {
}
