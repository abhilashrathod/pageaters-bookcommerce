export const FILE_UPLOAD_MODULES = {
  DEFAULT: 'DEFAULT',
  STORE_BOOK: 'STORE_BOOK',
  AUTHOR: 'AUTHOR',
  COLLECTION: 'COLLECTION',
  CATEGORY: 'CATEGORY',
  BUNDLE: 'BUNDLE',
  ASSETS: 'ASSETS',
};

export const BOOK_VERSIONS = ['hardcover', 'paperback', 'mass market paperback'];
export const READING_LEVELS = ['Beginner', 'Intermediate', 'Advance'];
export const BOOK_AVAILABILITY = ['available', 'procurement', 'import', 'pre-order'];

export const ORDER_STATUS = [
  {value: '', text: 'All'},
  {value: 'paid', text: 'Paid'},
  {value: 'shipped', text: 'Shipped'},
  {value: 'confirmed', text: 'Confirmed'},
  {value: 'fulfilled', text: 'Fulfilled'},
  {value: 'cancelled', text: 'Cancelled'},
  {value: 'returned', text: 'Returned'},
  {value: 'replacement', text: 'Replacement'},
  {value: 'return in progress', text: 'Return in Progress'},
  {value: 'replacement in progress', text: 'Replacement in Progress'},
  {value: 'refunded', text: 'Refunded'},
]

export const PRICING_PERCENTAGES = {
  NON_MEMBER_RENT: 50,
  MEMBER_PRICE: 75,
  MEMBER_RENT: 0,
  WHOLESALE_PRICE: 65,
};

export const BUCKETS = {
  BOOKS: 'https://storebooks.s3.ap-south-1.amazonaws.com',
  ASSETS: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com',
  AUTHORS: 'https://pageaters-authors.s3.ap-south-1.amazonaws.com',
  BUNDLES: 'https://pageaters-bundles.s3.ap-south-1.amazonaws.com',
  COLLECTIONS: 'https://pageaters-collections.s3.ap-south-1.amazonaws.com',
  CATEGORIES: 'https://pageaters-categories.s3.ap-south-1.amazonaws.com',
};

export const returnPercentageValue = (percent, total) => Math.floor((percent / 100) * total);
