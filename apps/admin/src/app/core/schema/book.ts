import {IAuthor} from './author';
import {ICategory} from './category';
import {IBundle} from './bundle';
import {ICollection} from './collection';

export interface IBook {
  _id: string;
  title: string;
  ISBN: string;
  tagline: string;
  description: string;
  bookId: string;
  poster: string;
  readingLevel: string;
  price: number;
  currentDiscount: number;
  tags: Array<string>;
  popularity: number;
  editorsPick: boolean;
  bestSeller: boolean;
  language: string;
  version: string;
  pages: number;
  dimensions: string;
  weight: number;
  publicationYear: number;
  publisher: string;
  totalReviews: number;
  averageReviews: string;
  categories: Array<ICategory>;
  relatedBooks: Array<IBook>;
  relatedBundles: Array<IBundle>;
  relatedCollections: Array<ICollection>;
  author: IAuthor;
  inventory: number;
  isDeleted: boolean;
  deletedAt: string;
}
