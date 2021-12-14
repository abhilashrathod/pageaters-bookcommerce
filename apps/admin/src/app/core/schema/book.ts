import {IAuthor} from './author';

export interface IBook {
  _id: string;
  title: string;
  ISBN: string;
  poster: string;
  price: number;
  membersPrice: number;
  currentDiscount: number;
  author: IAuthor;
  popularity: number;
  editorsPick: boolean;
  bestSeller: boolean;
}
