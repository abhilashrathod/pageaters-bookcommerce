import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {AdminRoutingModule} from './admin-routing.module';
import {SharedModule} from '@core/shared/shared.module';

import {HeaderComponent} from './partials/header/header.component';
import {SidebarComponent} from './partials/sidebar/sidebar.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {LayoutComponent} from './partials/layout/layout.component';


@NgModule({
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
  ],
  exports: [],
  declarations: [
    HeaderComponent,
    SidebarComponent,
    LayoutComponent,
    DashboardComponent
  ],
  providers: [],
})
export class AdminModule {
}
