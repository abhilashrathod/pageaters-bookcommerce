import {Component, OnInit} from '@angular/core';
import {IControlSchema} from '../../core/components/entity-form/control-schema';

@Component({
  templateUrl: 'login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent implements OnInit {

  loginFormSchema: Array<IControlSchema> = [
    {
      name: 'email',
      isRequired: true,
      type: 'text',
      ui: {
        placeholder: 'Please enter email'
      }
    },
    {
      name: 'password',
      type: 'password',
      isRequired: true,
      ui: {
        placeholder: 'Please enter password',
      }
    }
  ];

  constructor() {
  }

  ngOnInit() {
  }

  handleSubmit(event) {
    console.log('event', event);
  }
}
