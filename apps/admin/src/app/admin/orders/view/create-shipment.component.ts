import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: 'create-shipment.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
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
