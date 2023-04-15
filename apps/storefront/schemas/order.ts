import {IAddress} from "./address";
import {IBundle} from "./bundle";
import {IBook} from "./book";
import {IMysteryBox} from "./mystery-box";

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
  },
  status: string;
  shipment: string;
  books: Array<string>;
  bundles: Array<string>;
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
  boxes: Array<IOrderBoxItem>;
  bundles: Array<IOrderBundleItem>;
  orderHistory: Array<IOrderHistory>;
  requests: Array<IOrderRequest>;
  giftOptions: {
    isGift: boolean;
    details:{
      cost: number;
      message: string;
      from: string;
      package: string;
    }
  }
  giftCard: any;
  discount: any;
  subTotal: number;
  shipping: number;
  storeCredit: number;
  weight: number;
  total: number;
}
