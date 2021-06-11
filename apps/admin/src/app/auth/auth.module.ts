import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AuthRoutingModule} from './auth-routing.module';

import {EntityFormModule} from '../core/components/entity-form/entity-form.module';

import {LoginComponent} from './login/login.component';

@NgModule({
  imports: [CommonModule, EntityFormModule, AuthRoutingModule],
  exports: [],
  declarations: [LoginComponent],
  providers: [],
})
export class AuthModule {
}
