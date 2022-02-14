import {IBook} from './book';

export interface IAuthor {
  _id: string;
  authorId: string;
  name: string;
  intro: string;
  avatar: string;
  priority: number;
  popularity: number;
  isDeleted: boolean;
  deletedAt: string;
  books: Array<IBook>;
}
