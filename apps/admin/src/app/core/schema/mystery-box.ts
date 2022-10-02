export interface IMysteryBox {
  boxId: string;
  _id: string;
  title: string;
  description: string;
  tags: Array<string>;
  images: Array<string>;
  currentDiscount: number;
  weight: number;
  inventory: number;
  price: number;
  isDeleted: boolean;
  deletedAt: string;
}
