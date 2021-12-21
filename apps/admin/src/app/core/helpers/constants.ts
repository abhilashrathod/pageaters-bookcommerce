export const FILE_UPLOAD_MODULES = {
  AUTHOR: 'AUTHOR',
  COLLECTION: 'COLLECTION',
  CATEGORY: 'CATEGORY',
  STORE_BOOK: 'STORE_BOOK',
  BUNDLE: 'BUNDLE',
};

export const BOOK_VERSIONS = ['hardcover', 'paperback', 'mass market paperback'];
export const READING_LEVELS = ['Beginner', 'Intermediate', 'Advance'];

export const PRICING_PERCENTAGES = {
  NON_MEMBER_RENT: 50,
  MEMBER_PRICE: 80,
  MEMBER_RENT: 0,
};

export const BUCKETS = {
  BOOKS: 'https://storebooks.s3.ap-south-1.amazonaws.com',
  ASSETS: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com',
  AUTHORS: 'https://pageaters-authors.s3.ap-south-1.amazonaws.com',
  BUNDLES: 'https://pageaters-bundles.s3.ap-south-1.amazonaws.com',
  COLLECTIONS: 'https://pageaters-collections.s3.ap-south-1.amazonaws.com',
};

export const returnPercentageValue = (percent, total) => Math.ceil((percent / 100) * total);
