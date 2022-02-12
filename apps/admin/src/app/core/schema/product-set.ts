import {IBook} from './book';


export interface IProductSet {
  createdAt: string;
  deactivatedAt: string;
  description: string;
  isActive: boolean;
  products: Array<IProductItem>;
  setId: string;
  slug: string;
  title: string;
  updatedAt: string;
  __v: string;
  _id: string;
}

interface IProductItem {
  priority: number;
  product: IBook;
}
