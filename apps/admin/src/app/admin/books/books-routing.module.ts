import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {BooksListComponent} from './list/books-list.component';
import {BookUpdateComponent} from './update/book-update.component';
import {BookCreateComponent} from './create/book-create.component';
import {BookViewComponent} from './view/book-view.component';

const routes: Routes = [
  {path: '', redirectTo: 'list', pathMatch: 'full'},
  {path: 'list', component: BooksListComponent},
  {path: 'create', component: BookCreateComponent},
  {path: 'update/:id', component: BookUpdateComponent},
  {path: 'view/:id', component: BookViewComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BooksRoutingModule {
}
