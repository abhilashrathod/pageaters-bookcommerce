import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatButton } from '@angular/material/button';

@Component({
  templateUrl: 'cancel-order-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatSlideToggle,
    MatDialogActions,
    MatButton,
  ],
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
