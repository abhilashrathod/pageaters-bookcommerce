export const PRIMARY_COLOR = '#222222';
export const LIGHTER_PRIMARY_COLOR = '#3c3c3c';

export const PRIMARY_SUCCESS = '#009432';

export const ACCENT_COLOR = '#FF5F25';
export const LIGHTER_ACCENT_COLOR = '#FF5F25';
export const DARKER_ACCENT_COLOR = '#F14000';

export const SECONDARY_COLOR = '#FFFFFF';

export const LIGHT_COLOR = '#868686';


/***
 *
 * MEDIA BREAKPOINTS
 * ***********/

export const XS = 576;
export const SM = 768;
export const MD = 992;
export const LG = 1200;
export const XL = 1400;

/***
 *
 * FILE MODULE AND BUCKETS
 */

export const FILE_MODULES = {
  DEFAULT: 'DEFAULT',
  STORE_BOOK: 'STORE_BOOK',
  AUTHOR: 'AUTHOR',
  COLLECTION: 'COLLECTION',
  CATEGORY: 'CATEGORY',
  BUNDLE: 'BUNDLE',
  ASSETS: 'ASSETS',
};

export const BUCKETS_ORIGINS = {
  BOOKS: 'https://storebooks.s3.ap-south-1.amazonaws.com',
  ASSETS: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com',
  AUTHORS: 'https://pageaters-authors.s3.ap-south-1.amazonaws.com',
  BUNDLES: 'https://pageaters-bundles.s3.ap-south-1.amazonaws.com',
  COLLECTIONS: 'https://pageaters-collections.s3.ap-south-1.amazonaws.com',
  CATEGORIES: 'https://pageaters-categories.s3.ap-south-1.amazonaws.com',
};

export const BUCKETS = {
  AUTHOR: 'pageaters-authors',
  ASSETS: 'pageaters-assets',
  COLLECTIONS: 'pageaters-collections',
  CATEGORIES: 'pageaters-categories',
  BUNDLES: 'pageaters-bundles',
  BOOK: 'storebooks'
};

/***
 *
 * DROPDOWN OPTIONS FOR SELECT BOXES
 */

export const CATEGORY_SORT_OPTIONS = [
  {label: 'New Arrivals', value: 'createdAt|desc'},
  {label: 'Popularity', value: 'popularity|desc'},
  {label: 'Discounts', value: 'currentDiscount|desc'},
  {label: 'Price: High to Low', value: 'price|desc'},
  {label: 'Price: Low to High', value: 'price|asc'},
];

export const COLLECTION_SORT_OPTIONS = [
  {title: 'New Added', key: 'createdAt', sortValue: -1},
  {title: 'Popularity', key: 'popularity', sortValue: -1},
  {title: 'Recommended', key: 'priority', sortValue: -1},
  {title: 'Title', key: 'title', sortValue: 1}
];

export const BUNDLE_SORT_OPTIONS = [
  {title: 'New Added', key: 'createdAt', sortValue: -1},
  {title: 'Popularity', key: 'popularity', sortValue: -1},
  {title: 'Recommended', key: 'priority', sortValue: -1},
  {title: 'Title', key: 'title', sortValue: 1},
  {title: 'Price: High to Low', key: 'price', sortValue: -1},
  {title: 'Price: Low to High', key: 'price', sortValue: 1},
];

