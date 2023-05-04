import { IBook } from './book';
import { IBundle } from './bundle';
import { IAddress } from './address';
import { IMysteryBox } from './mystery-box';
import { ICreditTransaction } from './credit-transactions';

export interface IOrderProductItem {
  quantity: number;
  price: number;
  discount: number;
  weight: number;
  productTotal: number;
  product: IBook;
}

export interface IOrderBundleItem {
  quantity: number;
  price: number;
  discount: number;
  total: number;
  weight: number;
  bundle: IBundle;
}

export interface IOrderBoxItem {
  box: IMysteryBox;
  discount: number;
  preferences: {
    favoriteBooks: string;
    ignoredBooks: string;
    preferredAuthors: string;
    preferredGenres: string;
  },
  price: number;
  quantity: number;
  total: number;
  weight: number;
  _id: string;
}

export interface IOrderHistory {
  _id: string;
  title: string;
  description: string;
  time: string;
}

export interface IOrderRequest {
  _id: string;
  type: string;
  date: string;
  info: {
    reason: string;
    comments: string;
  };
  shipment: string;
  status: string;
  books: Array<IBook>;
  bundles: Array<IBundle>;
}

export interface IOrder {
  _id: string;
  userId: string;
  orderId: string;
  orderDate: string;
  razorOrderId: string;
  razorPaymentId: string;
  deliveryInstructions: string;
  deliveryAddress: IAddress;
  shipmentTrackingId: string;
  orderStatus: string;
  payment: any;
  products: Array<IOrderProductItem>;
  bundles: Array<IOrderBundleItem>;
  boxes: Array<IOrderBoxItem>;
  orderHistory: Array<IOrderHistory>;
  requests: Array<IOrderRequest>;
  storeCreditTransaction: Array<ICreditTransaction>
  giftCard: any;
  discount: any;
  subTotal: number;
  shipping: number;
  weight: number;
  storeCredit: number;
  total: number;
  giftOptions: {
    isGift: Boolean;
    details: {
      package: String;
      cost: Number;
      message: String;
      from: String;
    },
  }
}
