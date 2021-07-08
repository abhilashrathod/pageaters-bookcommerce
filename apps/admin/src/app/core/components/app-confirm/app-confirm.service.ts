import {Observable} from 'rxjs';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Injectable} from '@angular/core';

import {AppComfirmComponent} from './app-confirm.component';

@Injectable()
export class AppConfirmService {

  constructor(private dialog: MatDialog) {
  }

  public confirm(title: string, message: string): Observable<boolean> {
    let dialogRef: MatDialogRef<AppComfirmComponent>;
    dialogRef = this.dialog.open(AppComfirmComponent, {disableClose: true});
    dialogRef.updateSize('400px');
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;
    return dialogRef.afterClosed();
  }
}
