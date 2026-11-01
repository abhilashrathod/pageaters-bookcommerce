import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { canCancelOrder, OrderServices } from '@services/order.services';
import { apiErrorMessage } from '@services/api-client';
import type { AdminOrder } from '@pageaters/shared';
import { AlignShipmentDialogComponent } from './align-shipment-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { IssueCreditComponent } from './issue-credit.component';
import { CreateShipmentComponent } from './create-shipment.component';
import { CancelOrderDialogComponent } from './cancel-order-dialog.component';
import { MatCard, MatCardTitle, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe, TitleCasePipe, CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-order-view',
  templateUrl: 'order-view.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatFabButton,
    MatTooltip,
    MatIcon,
    DecimalPipe,
    TitleCasePipe,
    CurrencyPipe,
    DatePipe,
  ],
})
export class OrderViewComponent implements OnInit {
  order: AdminOrder;
  isReady = false;

  shipmentFormGroup: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private orderServices: OrderServices,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params.id) {
        this.getOrderDetails(params.id);
      }
    });
  }

  getOrderDetails(id): void {
    const order$ = this.orderServices.getById(id);
    order$.subscribe(
      (res) => {
        this.order = res;
        this.isReady = true;

        this.prepareShipmentForm();
        this.prepareRequestInfo();
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  prepareRequestInfo(): void {
    for (const req of this.order.requests) {
    }
  }

  prepareShipmentForm(): void {
    this.shipmentFormGroup = this.formBuilder.group({
      shipmentTrackingId: [this.order.shipmentTrackingId ? this.order.shipmentTrackingId : '', Validators.required],
    });
  }

  cancelShipmentConfirmation(): void {
    const dialogRef = this.dialog.open(CancelOrderDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.cancelShipment(res);
      }
    });
  }

  cancelShipment(data: any): void {
    const payload = {
      uniqueId: this.order.orderId,
      userId: this.order.userId,
      reason: data.reason,
      notify: data.notify,
    };

    const cancel$ = this.orderServices.cancelOrder(payload);
    cancel$.subscribe(
      (res) => {
        this.snackBar.open('Order marked as cancelled', 'OKAY', { duration: 3000 });
        this.getOrderDetails(this.order._id);
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  canCancel(): boolean {
    return !!this.order && canCancelOrder(this.order.orderStatus);
  }

  dumpRecord(): string {
    return JSON.stringify(this.order, null, `\t`);
  }

  handleShipmentSubmit(): void {
    const { value } = this.shipmentFormGroup;

    const payload = {
      ...value,
      orderId: this.order._id,
    };

    const update$ = this.orderServices.ship(payload);
    update$.subscribe(
      (res) => {
        this.snackBar.open('Order Shipped', 'OKAY', { duration: 3000 });
        this.getOrderDetails(this.order._id);
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  markAsDelivered(): void {
    const update$ = this.orderServices.fulfilled(this.order._id);
    update$.subscribe(
      (res) => {
        this.snackBar.open('Order Marked as Fulfilled', 'OKAY', { duration: 3000 });
        this.getOrderDetails(this.order._id);
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  /* RETURNS */

  alignReturn(requestId: string): void {
    const dialogRef = this.dialog.open(AlignShipmentDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.doReverseShipment(requestId, res);
      }
    });
  }

  openStoreCreditDialog(): void {
    const dialogRef = this.dialog.open(IssueCreditComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.doIssueCredit(res.credit);
      }
    });
  }

  doIssueCredit(creditAmount): void {
    const payload = {
      credit: creditAmount,
      orderId: this.order._id,
      userId: this.order.userId,
    };
    const obs$ = this.orderServices.issueStoreCredit(payload);
    obs$.subscribe((res) => {
      this.snackBar.open('Store credit issued.', 'OKAY', { duration: 3000 });
    });
  }

  openShipmentDialog(): void {
    const dialogRef = this.dialog.open(CreateShipmentComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.doShipShipment(res);
      }
    });
  }

  doShipShipment(dimensions): void {
    const payload = {
      address: {},
      dimensions,
    };
    const obs$ = this.orderServices.createShipment(this.order._id, payload);
    obs$.subscribe(
      (res) => {
        this.snackBar.open('Shipment Created', 'OKAY', { duration: 3000 });
        this.getOrderDetails(this.order._id);
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  closeReturnRequest(requestId: string): void {
    const obs$ = this.orderServices.closeReturnShipment(this.order._id, requestId);
    obs$.subscribe((res) => {
      this.getOrderDetails(this.order._id);
      this.snackBar.open('Request closed', 'OKAY', { duration: 3000 });
    });
  }

  closeReplaceRequest(requestId: string): void {
    const obs$ = this.orderServices.closeReplacementShipment(this.order._id, requestId);
    obs$.subscribe((res) => {
      this.getOrderDetails(this.order._id);
      this.snackBar.open('Replacement closed', 'OKAY', { duration: 3000 });
    });
  }

  doReverseShipment(requestId: string, data: any): void {
    const obs$ = this.orderServices.alignReturnShipment(this.order._id, requestId, data);
    obs$.subscribe((res) => {
      this.getOrderDetails(this.order._id);
      this.snackBar.open('Return shipment aligned.', 'OKAY', { duration: 3000 });
    });
  }
}
