import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: 'cancel-order-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CancelOrderDialogComponent implements OnInit {
  cancelFormGroup: UntypedFormGroup;

  constructor(
    private fb: UntypedFormBuilder,
    public dialogRef: MatDialogRef<CancelOrderDialogComponent>,
  ) {}

  ngOnInit() {
    this.buildForm();
  }

  buildForm() {
    this.cancelFormGroup = this.fb.group({
      reason: ['', Validators.required],
      notify: [false, Validators.required],
    });
  }

  handleShipmentSubmit() {
    const { value, valid } = this.cancelFormGroup;

    if (!valid) {
      return;
    }

    this.dialogRef.close(value);
  }
}
