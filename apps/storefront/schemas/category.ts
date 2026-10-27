export interface ICategory {
  _id: string;
  categoryId: string;
  title: string;
  description?: string;
  thumbnail: string;
  priority?: number;
  popularity?: number;
  numberOfBooks?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
