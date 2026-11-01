import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderServices } from '@services/order.services';
import { OrderViewComponent } from './order-view.component';

const order = {
  _id: 'o1',
  orderId: 'PE-1001',
  orderStatus: 'confirmed',
  shipmentTrackingId: '',
  userId: 'u1',
  deliveryAddress: {
    fullName: 'Asha Reader',
    contactNo: '9000000000',
    email: 'asha@example.com',
    addressLine1: '1 Demo Warehouse Road',
    addressLine2: 'Unit 2',
    landmark: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560001',
  },
  products: [],
  bundles: [],
  boxes: [],
  addOns: [],
  requests: [],
  orderHistory: [],
  giftOptions: { isGift: false },
  total: 499,
  shipping: 0,
  weight: 0.5,
};

describe('OrderViewComponent', () => {
  const orders = {
    getById: vi.fn(() => of(order)),
    ship: vi.fn(() => of({ ...order, orderStatus: 'shipped' })),
    fulfilled: vi.fn(() => of({ ...order, orderStatus: 'fulfilled' })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [OrderViewComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { params: of({ id: 'o1' }) } },
        { provide: OrderServices, useValue: orders },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    });
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(OrderViewComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('loads the order from the route id and renders it', () => {
    const el = render();
    expect(orders.getById).toHaveBeenCalledWith('o1');
    expect(el.querySelector('h1')?.textContent).toContain('PE-1001 (confirmed)');
    expect(el.textContent).toContain('Asha Reader');
  });

  it('ships the order with the entered tracking id', () => {
    const el = render();
    const input = el.querySelector<HTMLInputElement>('input[formControlName="shipmentTrackingId"]')!;
    input.value = 'TRK123';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(orders.ship).toHaveBeenCalledWith({ orderId: 'o1', shipmentTrackingId: 'TRK123' });
  });

  it('marks the order delivered from its button', () => {
    const el = render();
    const button = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Mark As Delivered'))!;
    button.click();
    expect(orders.fulfilled).toHaveBeenCalledWith('o1');
  });
});
