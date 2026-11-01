import {AppConfirmService} from './app-confirm.service';
import {MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {NgModule} from '@angular/core';

import {AppComfirmComponent} from './app-confirm.component';

@NgModule({
    imports: [MatDialogModule, MatButtonModule],
    exports: [AppComfirmComponent],
    declarations: [AppComfirmComponent],
    providers: [AppConfirmService]
})
export class AppConfirmModule {
}
