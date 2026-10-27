import {IBook} from './book';
import {ICollection} from './collection';

export interface IBundle {
  _id: string;
  bundleId: string;
  title: string;
  description?: string;
  tags?: Array<string>;
  poster: string;
  currentDiscount: number;
  bundledBooks?: Array<IBook>;
  relatedBundles?: Array<IBundle>;
  relatedCollections?: Array<ICollection>;
  popularity?: number;
  priority?: number;
  price: number;
  weight?: number;
  membersPrice?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
