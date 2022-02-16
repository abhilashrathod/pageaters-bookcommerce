import {IAuthor} from './author';
import {IBook} from './book';
import {ICategory} from './category';

export interface ICollection {
  collectionId: string;
  title: string;
  description?: string;
  tags: Array<string>;
  poster: string;
  priority?: number;
  popularity?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  books: Array<any>;
  relatedCollections?: Array<any>;
  relatedCategories?: Array<any>;
  featuredAuthors?: Array<any>;
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}
