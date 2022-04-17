import {IAddress} from "./address";
import {IBundle} from "./bundle";
import {IBook} from "./book";

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
  bundles: Array<IOrderBundleItem>;
  orderHistory: Array<IOrderHistory>;
  requests: Array<IOrderRequest>;
  giftCard: any;
  discount: any;
  subTotal: number;
  shipping: number;
  weight: number;
  total: number;
}
