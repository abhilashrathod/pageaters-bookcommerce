import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SharedModule} from '@core/shared/shared.module';

import {EntityFormComponent} from './entity-form.component';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedModule],
  exports: [EntityFormComponent],
  declarations: [EntityFormComponent],
  providers: [],
})
export class EntityFormModule {
}
