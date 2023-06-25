import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {OrderServices} from '../../../core/services/order.services';
import {IOrder} from '../../../core/schema/order';
import {AlignShipmentDialogComponent} from './align-shipment-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {IssueCreditComponent} from './issue-credit.component';
import { CreateShipmentComponent } from './create-shipment.component';

@Component({
  selector: 'app-order-view',
  templateUrl: 'order-view.component.html'
})

export class OrderViewComponent implements OnInit {
  order: IOrder;
  isReady = false;

  shipmentFormGroup: FormGroup;

  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private router: Router,
              private dialog: MatDialog,
              private route: ActivatedRoute,
              private orderServices: OrderServices) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getOrderDetails(params.id);
      }
    });
  }

  getOrderDetails(id): void {
    const order$ = this.orderServices.getById(id);
    order$.subscribe(res => {
      this.order = res;
      this.isReady = true;

      this.prepareShipmentForm();
      this.prepareRequestInfo();
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
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

  cancelShipment(): void {
    // write shipment cancel code
  }

  dumpRecord(): string {
    return JSON.stringify(this.order, null, `\t`);
  }

  handleShipmentSubmit(): void {
    const {value} = this.shipmentFormGroup;

    const payload = {
      ...value,
      orderId: this.order._id,
    };

    const update$ = this.orderServices.ship(payload);
    update$.subscribe(res => {
      this.snackBar.open('Order Shipped', 'OKAY', {duration: 3000});
      this.getOrderDetails(this.order._id);
    }, err => {
      this.snackBar.open(err, 'OKAY', {duration: 5000});
    });
  }

  markAsDelivered(): void {
    const update$ = this.orderServices.fulfilled(this.order._id);
    update$.subscribe(res => {
      this.snackBar.open('Order Marked as Fulfilled', 'OKAY', {duration: 3000});
      this.getOrderDetails(this.order._id);
    }, err => {
      this.snackBar.open(err, 'OKAY', {duration: 5000});
    });
  }

  /* RETURNS */

  alignReturn(requestId: string): void {
    const dialogRef = this.dialog.open(AlignShipmentDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed()
      .subscribe(res => {
        if (res) {
          this.doReverseShipment(requestId, res);
        }
      });
  }

  openStoreCreditDialog(): void {
    const dialogRef = this.dialog.open(IssueCreditComponent, {
      width: '400px',
    });

    dialogRef.afterClosed()
      .subscribe(res => {
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
    obs$.subscribe(res => {
      this.snackBar.open('Store credit issued.', 'OKAY', {duration: 3000});
    });
  }

  openShipmentDialog(): void {
    const dialogRef = this.dialog.open(CreateShipmentComponent, {
      width: '400px',
    });

    dialogRef.afterClosed()
      .subscribe(res => {
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
    const obs$ = this.orderServices.creteShipment(this.order._id, payload);
    obs$.subscribe(res => {
      this.snackBar.open('Shipment Created', 'OKAY', {duration: 3000});
      this.getOrderDetails(this.order._id);
    }, err => {
      console.log(err);
      this.snackBar.open(err.message, 'OKAY', {duration: 3000});
    });
  }


  closeReturnRequest(requestId: string): void {
    const obs$ = this.orderServices.closeReturnShipment(this.order._id, requestId);
    obs$.subscribe(res => {
      this.getOrderDetails(this.order._id);
      this.snackBar.open('Request closed', 'OKAY', {duration: 3000});
    });
  }

  closeReplaceRequest(requestId: string): void {
    const obs$ = this.orderServices.closeReplacementShipment(this.order._id, requestId);
    obs$.subscribe(res => {
      this.getOrderDetails(this.order._id);
      this.snackBar.open('Replacement closed', 'OKAY', {duration: 3000});
    });
  }

  doReverseShipment(requestId: string, data: any): void {
    const obs$ = this.orderServices.alignReturnShipment(this.order._id, requestId, data);
    obs$.subscribe(res => {
      this.getOrderDetails(this.order._id);
      this.snackBar.open('Return shipment aligned.', 'OKAY', {duration: 3000});
    });
  }
}
