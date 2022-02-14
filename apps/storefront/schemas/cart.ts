import {IBook} from './book';
import {IBundle} from './bundle';

export interface ICartItem {
  addedOn: string;
  price: number;
  product: IBook;
  productTotal: number;
  quantity: number;
  _id: string;
}

export interface ICartBundle {
  addedOn: string;
  bundle: IBundle;
  quantity: number;
  total: number;
  _id: string;
}

export interface ICart {
  createdAt: string;
  updatedAt: string;
  products: Array<ICartItem>;
  rentals: Array<ICartItem>;
  bundles: Array<ICartBundle>;
  subTotal: number;
  user: any;
  _id: string;
}
