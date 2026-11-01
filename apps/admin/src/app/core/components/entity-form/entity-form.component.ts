import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';

import {startCase} from 'lodash';
import {IControlSchema} from './control-schema';

@Component({
  selector: 'app-entity-form',
  templateUrl: 'entity-form.component.html'
})

export class EntityFormComponent implements OnInit {

  @Input() formSchema: Array<IControlSchema> = [];
  @Output() onSubmit = new EventEmitter();
  controlsFormGroup: FormGroup;

  startCase = startCase;

  constructor(private formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.buildForm(this.formSchema);
  }

  buildForm(schema): void {
    const config = {};
    for (const control of schema) {
      if (control.isRequired) {
        config[control.name] = new FormControl('', Validators.compose([Validators.required]));
      } else {
        config[control.name] = new FormControl('');
      }
    }
    this.controlsFormGroup = this.formBuilder.group(config);
  }

  doSubmitForm(formValue): void {
    this.onSubmit.emit(formValue);
  }
}
