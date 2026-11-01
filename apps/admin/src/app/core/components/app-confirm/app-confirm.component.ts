import { MatDialogRef, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-confirm',
  template: `<h1 mat-dialog-title>{{ title }}</h1>
    <div mat-dialog-content>
      <div class="m-b-15">
        <p class="text-center">{{ message }}</p>
      </div>
    </div>
    <div class="text-center">
      <button type="button" mat-stroked-button color="warn" (click)="dialogRef.close(true)">OK</button>
      &nbsp;
      <span fxFlex></span>
      <button type="button" color="primary" mat-stroked-button (click)="dialogRef.close(false)">Cancel</button>
    </div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatButton],
})
export class AppComfirmComponent {
  public title: string;
  public message: string;

  constructor(public dialogRef: MatDialogRef<AppComfirmComponent>) {}
}
