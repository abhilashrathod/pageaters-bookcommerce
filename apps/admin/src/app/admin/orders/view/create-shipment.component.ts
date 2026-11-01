import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  templateUrl: 'create-shipment.component.html',
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
    MatDialogActions,
    MatButton,
  ],
})
export class CreateShipmentComponent implements OnInit {
  weightFormGroup: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public dialogRef: MatDialogRef<CreateShipmentComponent>,
  ) {}

  ngOnInit(): void {
    this.prepareForm();
  }

  prepareForm(): void {
    this.weightFormGroup = this.formBuilder.group({
      width: [0, Validators.compose([Validators.required, Validators.min(1)])],
      height: [0, Validators.compose([Validators.required, Validators.min(1)])],
      weight: [0, Validators.compose([Validators.required, Validators.min(1)])],
    });
  }

  handleSubmit(): void {
    this.dialogRef.close(this.weightFormGroup.value);
  }
}
