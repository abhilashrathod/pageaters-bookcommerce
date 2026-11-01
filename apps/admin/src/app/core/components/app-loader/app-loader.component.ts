import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-app-loader',
  templateUrl: './app-loader.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AppLoaderComponent implements OnInit {
  title;
  message;

  constructor(public dialogRef: MatDialogRef<AppLoaderComponent>) {}

  ngOnInit() {}
}
