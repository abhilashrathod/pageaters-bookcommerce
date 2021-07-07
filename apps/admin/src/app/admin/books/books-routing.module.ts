import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {BooksListComponent} from './list/books-list.component';
import {BookUpdateComponent} from './update/book-update.component';
import {BookCreateComponent} from './create/book-create.component';

const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: BooksListComponent},
  {path: 'create', component: BookCreateComponent},
  {path: 'update/:id', component: BookUpdateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BooksRoutingModule {
}
