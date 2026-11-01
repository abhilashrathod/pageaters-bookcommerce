import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {SharedModule} from '@core/shared/shared.module';
import {EntityTableModule} from '@components/entity-table/entity-table.module';
import {OrderRoutingModule} from './order-routing.module';

import {OrderListComponent} from './list/order-list.component';
import {OrderCreateComponent} from './create/order-create.component';
import {OrderUpdateComponent} from './update/order-update.component';
import {OrderViewComponent} from './view/order-view.component';

import {AlignShipmentDialogComponent} from './view/align-shipment-dialog.component';
import {IssueCreditComponent} from './view/issue-credit.component';
import {CreateShipmentComponent} from './view/create-shipment.component';
import {CancelOrderDialogComponent} from './view/cancel-order-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        SharedModule,
        EntityTableModule,
        OrderRoutingModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    exports: [],
    declarations: [
        OrderListComponent,
        OrderCreateComponent,
        OrderUpdateComponent,
        OrderViewComponent,
        AlignShipmentDialogComponent,
        IssueCreditComponent,
        CreateShipmentComponent,
        CancelOrderDialogComponent,
    ],
    providers: []
})
export class OrderModule {
}
