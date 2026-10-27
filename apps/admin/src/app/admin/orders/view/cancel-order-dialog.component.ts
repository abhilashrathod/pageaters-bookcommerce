import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: 'cancel-order-dialog.component.html'
})

export class CancelOrderDialogComponent implements OnInit {
  cancelFormGroup: FormGroup;

  constructor(private fb: FormBuilder,
    public dialogRef: MatDialogRef<CancelOrderDialogComponent>) { }

  ngOnInit() {
    this.buildForm();
   }

  buildForm() {
    this.cancelFormGroup = this.fb.group({
      reason: ['', Validators.required],
      notify: [false, Validators.required]
    })
  }

  handleShipmentSubmit() {
    const { value, valid }  = this.cancelFormGroup;

    if (!valid) {
      return;
    }

    this.dialogRef.close(value);
  }
}
