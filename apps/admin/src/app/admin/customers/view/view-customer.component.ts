import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {CustomerService} from '../../../core/services/customer.service';
import {IUser} from '../../../core/schema/user';
import {ICart} from '../../../core/schema/cart';
import {IAddress} from '../../../core/schema/address';
import {IOrder} from '../../../core/schema/order';

@Component({
  selector: 'app-view-customer',
  templateUrl: 'view-customer.component.html'
})

export class ViewCustomerComponent implements OnInit {
  details: { user: IUser, cart: ICart, addresses: Array<IAddress>, orders: Array<IOrder> } = {
    user: null,
    cart: null,
    addresses: [],
    orders: [],
  };
  isReady = false;

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private customerService: CustomerService) {
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getOrderDetails(params.id);
      }
    });
  }

  getOrderDetails(id): void {
    const user$ = this.customerService.getById(id);
    user$.subscribe(res => {
      this.details = res;
      this.isReady = true;

      console.log('user', this.details);
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }
}
