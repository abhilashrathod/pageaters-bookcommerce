export const FILE_UPLOAD_MODULES = {
  AUTHOR: 'AUTHOR',
  COLLECTION: 'COLLECTION',
  CATEGORY: 'CATEGORY',
  STORE_BOOK: 'STORE_BOOK',
  BUNDLE: 'BUNDLE',
};

export const BOOK_VERSIONS = ['hardcover', 'paperback'];

export const PRICING_PERCENTAGES = {
  NON_MEMBER_RENT: 50,
  MEMBER_PRICE: 80,
  MEMBER_RENT: 0,
};

export const returnPercentageValue = (percent, total) => ((percent / 100) * total);
