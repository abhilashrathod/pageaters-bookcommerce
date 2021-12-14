import {IBook} from './book';

export interface IBundle {
  _id: string;
  bundleId: string;
  title: string;
  description: string;
  tags: Array<string>;
  poster: string;
  currentDiscount: number;
  bundledBooks: Array<IBook>;
  popularity: number;
  priority: number;
  price: number;
  membersPrice: number;
  isDeleted: boolean;
  deletedAt: string;
  createdAt: string;
  updatedAt: string;
}
