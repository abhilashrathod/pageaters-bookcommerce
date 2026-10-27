import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {CartService} from '../../../core/services/cart.service';
import {ICart} from '../../../core/schema/cart';

@Component({
  selector: 'app-cart-view',
  templateUrl: './cart-view.component.html'
})
export class CartViewComponent implements OnInit {
  cart: ICart;
  isReady = false;

  constructor(private snackBar: MatSnackBar,
              private cartService: CartService,
              private route: ActivatedRoute,
              private router: Router) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getCartDetails(params.id);
      }
    });
  }

  getCartDetails(id): void {
    const cart$ = this.cartService.getById(id);
    cart$.subscribe(res => {
      this.cart = res;
      this.isReady = true;

      console.log("this.cart", this.cart);
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

}
