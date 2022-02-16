export interface IBanner {
  bannerId?: string;
  poster: string;
  ctaLink?: string;
  ctaText?: string;
  title: string;
  description?: string;
  priority?: number;
  isActive?: boolean;
  deactivatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
