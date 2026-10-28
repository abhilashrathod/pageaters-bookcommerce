// Test-only (excluded from the build): fictional documents shaped like the shopper endpoints' responses, each
// already in its schema's output form (no unknown keys), so a validated call resolves to a deep-equal value.

export const id = (n: number) => `64d0000000000000000${String(n).padStart(5, '0')}`;
const now = '2026-10-28T10:00:00.000Z';
const blob = (name: string) => `https://abc123.public.blob.vercel-storage.com/catalog/${name}.png`;
const stamps = { createdAt: now, updatedAt: now };

export function pick<T extends object, K extends keyof T>(source: T, ...keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) result[key] = source[key];
  return result;
}

export function page<T>(docs: T[]) {
  return {
    docs,
    totalDocs: docs.length,
    limit: 10,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };
}

export const authorFields = {
  _id: id(1),
  ...stamps,
  authorId: 'AU-0000000001',
  name: 'An Author',
  intro: 'Writes stories.',
  avatar: blob('author'),
  priority: 1,
  popularity: 10,
};

export const category = {
  _id: id(2),
  ...stamps,
  categoryId: 'CA-0000000001',
  title: 'Fiction',
  description: 'Stories.',
  thumbnail: blob('fiction'),
  priority: 1,
  popularity: 10,
  numberOfBooks: 1,
  meta: { title: 'Fiction', description: 'Stories.', imageUrl: blob('fiction'), url: '' },
};
const categoryRef = pick(category, '_id', 'categoryId', 'title');

export const bookFields = {
  _id: id(3),
  ...stamps,
  bookId: 'BK-0000000001',
  type: 'book' as const,
  title: 'A Book',
  blindTitle: '',
  tagline: 'A tagline',
  eyebrow: '',
  description: 'About the book.',
  tags: ['fiction'],
  language: 'English',
  pages: 320,
  readingLevel: 'Beginner' as const,
  version: 'paperback' as const,
  books: -1,
  dimensions: '12.9 x 2.3 x 19.7',
  weight: 250,
  ISBN: '9780000000001',
  publicationYear: '2020',
  publisher: 'A Publisher',
  editorsPick: false,
  bestSeller: true,
  newRelease: false,
  preOrder: false,
  bookOfTheMonth: false,
  availability: 'available' as const,
  poster: blob('book'),
  images: [blob('book-2')],
  totalReviews: 0,
  averageReviews: 0,
  inventory: 12,
  currentDiscount: 15,
  popularity: 10,
  priority: 1,
  price: 399,
  rentPrice: 99,
  membersPrice: 359.1,
  membersRentPrice: 89.1,
};
const populatedAuthor = pick(authorFields, '_id', 'name', 'avatar');

export const bundleFields = {
  _id: id(4),
  ...stamps,
  bundleId: 'BN-0000000001',
  title: 'A Bundle',
  description: 'Two books.',
  tags: [],
  poster: blob('bundle'),
  currentDiscount: 10,
  weight: 500,
  popularity: 5,
  priority: 1,
  price: 999,
  membersPrice: 899,
};

export const collectionFields = {
  _id: id(5),
  ...stamps,
  collectionId: 'CL-0000000001',
  title: 'A Collection',
  description: 'Hand-picked.',
  tags: ['picks'],
  poster: blob('collection'),
  priority: 1,
  popularity: 5,
};

// GET /store-books/unique/:bookId: the whole book, references populated.
export const bookDetail = {
  ...bookFields,
  author: pick(authorFields, '_id', 'authorId', 'name', 'avatar'),
  bundledBooks: [],
  categories: [categoryRef],
  relatedBooks: [
    { ...pick(bookFields, '_id', 'title', 'bookId', 'poster', 'price'), _id: id(6), author: { _id: id(1), name: 'An Author' } },
  ],
  relatedBundles: [{ ...pick(bundleFields, '_id', 'bundleId', 'title', 'poster', 'price'), bundledBooks: [id(3), id(6)] }],
  relatedCollections: [
    { ...pick(collectionFields, '_id', 'collectionId', 'title', 'poster'), books: [{ _id: id(3), title: 'A Book', poster: blob('book') }] },
  ],
};

export const bookListItem = {
  ...pick(
    bookFields,
    '_id',
    'title',
    'bookId',
    'ISBN',
    'inventory',
    'poster',
    'images',
    'tags',
    'price',
    'weight',
    'popularity',
    'editorsPick',
    'newRelease',
    'preOrder',
    'currentDiscount',
    'bestSeller',
  ),
  author: pick(authorFields, '_id', 'name', 'intro', 'avatar'),
  categories: [categoryRef],
};

export const bookSearchResult = {
  ...pick(
    bookFields,
    '_id',
    'title',
    'ISBN',
    'bookId',
    'poster',
    'weight',
    'price',
    'popularity',
    'inventory',
    'editorsPick',
    'newRelease',
    'preOrder',
    'currentDiscount',
    'bestSeller',
  ),
  author: { _id: id(1), name: 'An Author' },
};

export const categoryProduct = {
  ...pick(
    bookFields,
    '_id',
    'title',
    'bookId',
    'ISBN',
    'poster',
    'price',
    'popularity',
    'availability',
    'editorsPick',
    'inventory',
    'currentDiscount',
    'newRelease',
    'preOrder',
    'bestSeller',
  ),
  author: pick(authorFields, '_id', 'name', 'avatar'),
  categories: [categoryRef],
};

export const author = { ...authorFields, books: [id(3)] };
export const authorDetail = { ...authorFields, books: [pick(bookFields, '_id', 'title', 'bookId', 'poster', 'price', 'availability')] };
export const authorListItem = { ...pick(authorFields, '_id', 'authorId', 'name', 'popularity'), books: [id(3)] };

export const collection = {
  ...collectionFields,
  books: [id(3)],
  relatedCollections: [],
  relatedCategories: [id(2)],
  featuredAuthors: [id(1)],
};
export const collectionListItem = {
  ...pick(collectionFields, '_id', 'collectionId', 'title', 'tags', 'poster', 'priority', 'popularity'),
  books: [{ ...pick(bookFields, '_id', 'title', 'bookId', 'poster', 'price'), author: populatedAuthor, categories: [categoryRef] }],
};
export const collectionDetail = {
  ...collectionFields,
  books: [pick(bookFields, '_id', 'bookId', 'title', 'poster', 'price', 'inventory')],
  relatedCollections: [],
  relatedCategories: [pick(category, '_id', 'categoryId', 'title', 'numberOfBooks', 'thumbnail')],
  featuredAuthors: [{ ...pick(authorFields, '_id', 'authorId', 'name', 'avatar'), books: [id(3)] }],
};

export const bundle = { ...bundleFields, bundledBooks: [id(3), id(6)], categories: [id(2)], relatedCollections: [], relatedBundles: [] };
export const bundleListItem = {
  ...pick(bundleFields, '_id', 'bundleId', 'title', 'poster', 'currentDiscount', 'priority', 'price', 'membersPrice'),
  bundledBooks: [id(3), id(6)],
};
export const bundleDetail = {
  ...bundle,
  bundledBooks: [pick(bookFields, '_id', 'bookId', 'title', 'poster', 'price', 'inventory')],
  categories: [{ _id: id(2), title: 'Fiction' }],
  inventory: 1,
};

export const productSetDetail = {
  _id: id(7),
  ...stamps,
  setId: 'PS-0000000001',
  slug: 'new-releases',
  title: 'New releases',
  description: '',
  products: [{ ...pick(bookFields, '_id', 'bookId', 'title', 'poster', 'price', 'availability'), author: populatedAuthor }, null],
  categories: [pick(category, '_id', 'categoryId', 'title', 'numberOfBooks', 'thumbnail')],
};

export const deal = {
  _id: id(8),
  ...stamps,
  dealId: 'DL-0000000001',
  poster: blob('deal'),
  ctaLink: '/collections/CL-0000000001',
  ctaText: 'Shop now',
  title: 'A Deal',
  description: '',
  priority: 1,
  productSets: [
    {
      _id: id(9),
      priority: 1,
      set: {
        _id: id(7),
        setId: 'PS-0000000001',
        title: 'New releases',
        products: [{ _id: id(10), priority: 1, product: pick(bookFields, '_id', 'bookId', 'title', 'poster', 'price') }],
      },
    },
  ],
  categories: [pick(category, '_id', 'categoryId', 'title')],
};
export const dealListItem = pick(deal, '_id', 'dealId', 'poster', 'ctaLink', 'ctaText', 'title');

export const addOn = {
  _id: id(11),
  ...stamps,
  addOnId: 'AD-0000000001',
  name: 'Bookmark',
  description: 'A paper bookmark.',
  poster: blob('bookmark'),
  category: 'Bookmarks',
  priority: 1,
  price: 49,
  currentDiscount: 0,
  inventory: 100,
};

export const mysteryBox = {
  _id: id(12),
  ...stamps,
  boxId: 'MB-0000000001',
  title: 'A Box',
  description: 'Three surprises.',
  tags: [],
  images: [blob('box')],
  currentDiscount: 0,
  weight: 900,
  inventory: 5,
  price: 799,
  books: 3,
};

// The shopper's own records.
export const user = {
  _id: id(20),
  email: 'shopper@demo.pageaters.com',
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  dateOfBirth: '',
  gender: '',
  emailVerified: true,
  contactVerified: false,
  storeCredit: 150,
  lastLoginAt: now,
  lastPasswordSetAt: '',
};

export const address = {
  _id: id(21),
  userId: id(20),
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  email: 'shopper@demo.pageaters.com',
  addressLine1: '42 Demo Lane',
  addressLine2: 'Sample Nagar',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560001',
  country: 'IN',
  type: 'HOME' as const,
  isDefault: true,
  isDeleted: false,
  deletedAt: '',
  ...stamps,
};

const addedOn = 'Wed Oct 28 2026 15:30:00 GMT+0530 (India Standard Time)';
const preferences = { preferredAuthors: '', preferredGenres: 'Fantasy', favoriteBooks: '', ignoredBooks: '' };
const lineBook = { ...pick(bookFields, '_id', 'bookId', 'title', 'poster', 'currentDiscount', 'price'), author: populatedAuthor };
const lineBundle = {
  ...pick(bundleFields, '_id', 'bundleId', 'title', 'poster', 'currentDiscount', 'price'),
  bundledBooks: [id(3), id(6)],
};
const lineAddOn = pick(addOn, '_id', 'name', 'poster', 'currentDiscount', 'price');
const lineBox = pick(mysteryBox, '_id', 'boxId', 'title', 'images', 'currentDiscount', 'price');

const cartBase = { _id: id(22), user: id(20), subTotal: 0, isDeleted: false, deletedAt: '', ...stamps };
export const cartDocument = {
  ...cartBase,
  products: [{ _id: id(23), product: id(3), quantity: 2, addedOn }],
  bundles: [],
  addOns: [],
  mysteryBoxes: [],
};
export const populatedCart = {
  ...cartBase,
  subTotal: 2525,
  products: [
    { _id: id(23), product: { ...lineBook, availability: 'available' as const }, quantity: 2, addedOn, price: 399, productTotal: 678 },
  ],
  bundles: [{ _id: id(24), bundle: lineBundle, quantity: 1, addedOn, total: 899 }],
  addOns: [{ _id: id(25), addOn: lineAddOn, quantity: 3, addedOn, price: 49, total: 147 }],
  mysteryBoxes: [{ _id: id(26), box: lineBox, quantity: 1, addedOn, preferences, price: 799, total: 799 }],
};

export const favorites = {
  _id: id(27),
  wishlist: [
    {
      ...pick(
        bookFields,
        '_id',
        'title',
        'bookId',
        'ISBN',
        'inventory',
        'poster',
        'price',
        'popularity',
        'editorsPick',
        'currentDiscount',
        'newRelease',
        'preOrder',
        'bestSeller',
      ),
      author: id(1),
    },
  ],
};

const orderLines = {
  deliveryAddress: address,
  products: [{ _id: id(30), product: lineBook, quantity: 2, price: 399, discount: 15, productTotal: 678.3, weight: 500 }],
  bundles: [{ _id: id(31), bundle: lineBundle, quantity: 1, price: 999, discount: 10, total: 899.1, weight: 500 }],
};
const orderHistory = [{ _id: id(32), title: 'confirmed', description: 'We have received your order.', time: now }];
const giftOptions = { isGift: false, details: { package: '', cost: 0, message: '', from: '' } };

export const customerOrder = {
  _id: id(33),
  orderId: 'OD-0000000001',
  orderDate: now,
  orderStatus: 'confirmed' as const,
  shipmentTrackingId: '',
  giftOptions,
  orderHistory,
  payment: { method: 'cod' as const },
  ...orderLines,
  addOns: [{ _id: id(34), addOn: lineAddOn, quantity: 1, price: 49, discount: 0, total: 49 }],
  boxes: [{ _id: id(35), box: lineBox, quantity: 1, price: 799, discount: 0, total: 799, weight: 900, preferences }],
  subTotal: 2425.4,
  shipping: 0,
  storeCredit: 100,
  total: 2325.4,
};

export const customerOrderListItem = {
  ...pick(customerOrder, '_id', 'orderId', 'orderDate', 'orderStatus', 'shipmentTrackingId', 'products', 'bundles', 'boxes', 'total'),
  deliveryAddress: address,
};

export const checkoutOrder = {
  _id: id(36),
  orderId: 'OD-0000000002',
  userId: id(20),
  orderDate: '',
  subTotal: 1577,
  shipping: 0,
  storeCredit: 0,
  total: 1577,
  giftOptions,
  deliveryInstructions: '',
  orderHistory: [],
  ...orderLines,
};

export const storeCreditBalance = { _id: id(20), storeCredit: 150 };
export const storeCreditTransaction = {
  _id: id(37),
  creditId: 'CR-0000000001',
  userId: id(20),
  orderId: id(33),
  amount: 150,
  action: 'CREDIT' as const,
  expired: false,
  expiredAt: '',
  ...stamps,
};

export const stockAlert = { _id: id(38), user: id(20), product: id(3), isDeleted: false, deletedAt: '', ...stamps };
