import {IProductSet} from './product-set';

export interface IDeal {
  dealId: string;
  poster: string;
  ctaLink: string;
  ctaText: string;
  title: string;
  description?: string;
  priority?: number;
  isActive?: boolean;
  deactivatedAt?: string;
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  productSets?: Array<ISetItem>;
}

export interface ISetItem {
  _id: string;
  priority: number;
  set: IProductSet;
}
