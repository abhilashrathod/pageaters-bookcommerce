import {Injectable} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {AppLoaderComponent} from './app-loader.component';

@Injectable()
export class AppLoaderService {
  dialogRef: MatDialogRef<AppLoaderComponent>;

  constructor(private dialog: MatDialog) {
  }

  public open(title: string = 'Please wait'): Observable<boolean> {
    this.dialogRef = this.dialog.open(AppLoaderComponent, {disableClose: true});
    this.dialogRef.updateSize('250px');
    this.dialogRef.componentInstance.title = title;
    return this.dialogRef.afterClosed();
  }

  public close() {
    this.dialogRef.close();
  }
}
