import {IBook} from './book';
import {IBundle} from './bundle';
import {IMysteryBox} from "./mystery-box";

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

export interface ICartMysteryBox {
  addedOn: string;
  box: IMysteryBox;
  preferences: {
    favoriteBooks: string;
    ignoredBooks: string;
    preferredAuthors: string;
    preferredGenres: string;
  };
  quantity: number;
  price: number;
  total: number;
  _id: string;
}

export interface ICart {
  createdAt: string;
  updatedAt: string;
  products: Array<ICartItem>;
  bundles: Array<ICartBundle>;
  mysteryBoxes: Array<ICartMysteryBox>;
  subTotal: number;
  user: any;
  _id: string;
}
