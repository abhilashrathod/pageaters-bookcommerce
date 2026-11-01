import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-align-shipment-dialog',
  templateUrl: 'align-shipment-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
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
