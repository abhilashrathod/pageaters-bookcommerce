import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-align-shipment-dialog',
  templateUrl: 'align-shipment-dialog.component.html'
})

export class AlignShipmentDialogComponent implements OnInit {
  shipmentFormGroup: FormGroup;

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<AlignShipmentDialogComponent>) {
  }

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
