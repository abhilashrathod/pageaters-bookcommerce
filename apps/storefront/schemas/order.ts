import {IAddress} from "./address";
import {IBundle} from "./bundle";
import {IBook} from "./book";

interface IOrderProductItem {
  quantity: number;
  price: number;
  discount: number;
  weight: number;
  productTotal: number;
  product: IBook;
}

interface IOrderBundleItem {
  quantity: number;
  price: number;
  discount: number;
  total: number;
  weight: number;
  bundle: IBundle;
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
  giftCard: any;
  discount: any;
  subTotal: number;
  shipping: number;
  weight: number;
  total: number;
}
