import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {LayoutComponent} from './partials/layout/layout.component';
import {DashboardComponent} from './dashboard/dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'books',
        loadChildren: () => import('./books/books.module').then(m => m.BooksModule)
      },
      {
        path: 'bundles',
        loadChildren: () => import('./bundles/bundles.module').then(m => m.BundlesModule)
      },
      {
        path: 'authors',
        loadChildren: () => import('./authors/author.module').then(m => m.AuthorModule)
      },
      {
        path: 'categories',
        loadChildren: () => import('./categories/category.module').then(m => m.CategoryModule)
      },
      {
        path: 'collections',
        loadChildren: () => import('./collections/collection.module').then(m => m.CollectionModule)
      },
      {
        path: 'customers',
        loadChildren: () => import('./customers/customer.module').then(m => m.CustomerModule)
      },
      {
        path: 'carts',
        loadChildren: () => import('./carts/cart.module').then(m => m.CartModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {
}
