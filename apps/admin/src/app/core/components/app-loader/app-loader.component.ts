import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-app-loader',
  templateUrl: './app-loader.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatProgressSpinner],
})
export class AppLoaderComponent implements OnInit {
  title;
  message;

  constructor(public dialogRef: MatDialogRef<AppLoaderComponent>) {}

  ngOnInit() {}
}
