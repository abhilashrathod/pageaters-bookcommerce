import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '@services/cart.service';
import { ICart } from '@schema/cart';
import { MatCard, MatCardTitle, MatCardContent } from '@angular/material/card';
import { DecimalPipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-cart-view',
  templateUrl: './cart-view.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatCard, MatCardTitle, MatCardContent, DecimalPipe, CurrencyPipe],
})
export class CartViewComponent implements OnInit {
  cart: ICart;
  isReady = false;

  constructor(
    private snackBar: MatSnackBar,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params.id) {
        this.getCartDetails(params.id);
      }
    });
  }

  getCartDetails(id): void {
    const cart$ = this.cartService.getById(id);
    cart$.subscribe(
      (res) => {
        this.cart = res;
        this.isReady = true;

        console.log('this.cart', this.cart);
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
