import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  templateUrl: 'create-shipment.component.html',
})
export class CreateShipmentComponent implements OnInit {
  weightFormGroup: FormGroup;

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<CreateShipmentComponent>) {
  }

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
