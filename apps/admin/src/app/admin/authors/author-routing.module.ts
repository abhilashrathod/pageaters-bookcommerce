import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {AuthorListComponent} from './list/author-list.component';
import {AuthorCreateComponent} from './create/author-create.component';
import {AuthorUpdateComponent} from './update/author-update.component';


const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: AuthorListComponent},
  {path: 'create', component: AuthorCreateComponent},
  {path: 'update/:id', component: AuthorUpdateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthorRoutingModule {
}
