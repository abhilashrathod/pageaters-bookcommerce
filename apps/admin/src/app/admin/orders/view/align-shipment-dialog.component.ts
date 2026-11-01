import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-align-shipment-dialog',
  templateUrl: 'align-shipment-dialog.component.html',
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
export class AlignShipmentDialogComponent implements OnInit {
  shipmentFormGroup: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public dialogRef: MatDialogRef<AlignShipmentDialogComponent>,
  ) {}

  ngOnInit(): void {
    this.prepareShipmentForm();
  }

  prepareShipmentForm(): void {
    this.shipmentFormGroup = this.formBuilder.group({
      shipment: ['', Validators.required],
    });
  }

  handleShipmentSubmit(): void {
    this.dialogRef.close(this.shipmentFormGroup.value);
  }
}
