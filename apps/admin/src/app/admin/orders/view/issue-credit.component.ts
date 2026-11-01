import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-issue-credit',
  templateUrl: 'issue-credit.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class IssueCreditComponent implements OnInit {
  creditFormGroup: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public dialogRef: MatDialogRef<IssueCreditComponent>,
  ) {}

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
