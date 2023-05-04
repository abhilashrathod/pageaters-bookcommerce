import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-issue-credit',
  templateUrl: 'issue-credit.component.html'
})

export class IssueCreditComponent implements OnInit {
  creditFormGroup: FormGroup;

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<IssueCreditComponent>) {
  }

  ngOnInit(): void {
    this.prepareCreditForm();
  }

  prepareCreditForm(): void {
    this.creditFormGroup = this.formBuilder.group({
      credit: [0, Validators.compose([Validators.required, Validators.min(1)])],
    });
  }

  handleSubmit(): void {
    this.dialogRef.close(this.creditFormGroup.value);
  }
}
