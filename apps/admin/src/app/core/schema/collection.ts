import {IAuthor} from './author';
import {IBook} from './book';
import {ICategory} from './category';

export interface ICollection {
  collectionId: string;
  title: string;
  description: string;
  tags: Array<string>;
  poster: string;
  priority: number;
  popularity: number;
  isDeleted: boolean;
  deletedAt: string;
  books: Array<IBook>;
  relatedCollections: Array<ICollection>;
  relatedCategories: Array<ICategory>;
  featuredAuthors: Array<IAuthor>;
  _id: string;
  createdAt: string;
  updatedAt: string;
}
