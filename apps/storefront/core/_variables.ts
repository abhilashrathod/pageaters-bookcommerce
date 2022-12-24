export const PRIMARY_COLOR = '#222222';
export const LIGHTER_PRIMARY_COLOR = '#3c3c3c';
export const LIGHTEST_PRIMARY_COLOR = '#717171';

export const PRIMARY_SUCCESS = '#009432';
export const PRIMARY_DANGER = '#e55039';

export const ACCENT_COLOR = '#FF5F25';
export const LIGHTER_ACCENT_COLOR = '#FF5F25';
export const DARKER_ACCENT_COLOR = '#F14000';

export const SECONDARY_ACCENT_COLOR = '#F90716';

export const SECONDARY_COLOR = '#FFFFFF';

export const LIGHT_COLOR = '#868686';



/**
 *
 * SEO
 * ***********/

export const HORIZONTAL_LOGO = `https://res.cloudinary.com/pageaters/image/upload/v1650978952/horizontal-logo_i7ding.png`;
export const ICON_LOGO = `https://res.cloudinary.com/pageaters/image/upload/v1624876170/design-4_qps5su.png`;

/**
 *
 * SEO
 * ***********/

export const SEO_SETTINGS = {
  TWITTER_SITE: '@pageaters',
  TWITTER_CREATOR: '@pageaters',
  OPEN_GRAPH_SITE_NAME: 'pageaters.com',
};

/***
 *
 * REGEX
 * ***********/

export const CONTACT_NO_REGEX = /^\d{10}$/;

/***
 *
 * AUTH
 * ***********/

export const AUTH_COOKIE = `_LID`;

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
  {label: 'New Arrivals', value: 'publicationYear|desc'},
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

/***
 *
 * FULL VIEW PAGES
 */

export const FULL_PAGE = ['/', '/auth/register', '/auth/login', '/collections/[id]'];

/***
 *
 * NAVIGATION
 */

export const FOOTER_NAVIGATION = [
  {
    linkName: 'Company',
    linkHref: '/',
    children: [
      {
        linkName: 'About',
        linkHref: '/about',
      }, {
        linkName: 'Contact',
        linkHref: '/contact',
      }, {
        linkName: 'Privacy Policy',
        linkHref: '/privacy-policy',
      }, {
        linkName: 'Terms of Use',
        linkHref: '/terms-and-conditions',
      }, {
        linkName: 'Cancellation and Returns',
        linkHref: '/cancellation',
      },
      {
        linkName: 'Shipping Policy',
        linkHref: '/shipping',
      }
    ]
  },
  // {
  //   linkName: 'Pages',
  //   linkHref: '/',
  //   children: [
  //     {
  //       linkName: 'Membership',
  //       linkHref: '/',
  //     },
      // {
      //   linkName: 'Incentive Program',
      //   linkHref: '/',
      // }, {
      //   linkName: 'Influencer Program',
      //   linkHref: '/',
      // }
  //   ]
  // }
];

export const SIDE_NAVIGATION = [
  {
    linkName: 'Shop',
    linkHref: '/',
    children: [
      {
        linkName: 'Offers & Discounts',
        linkHref: '/deals',
      }, {
        linkName: 'Categories',
        linkHref: '/categories',
      }, {
        linkName: 'Collections',
        linkHref: '/collections',
      }, {
        linkName: 'Bundles',
        linkHref: '/bundles',
      }
    ]
  },
  {
    linkName: 'Account',
    linkHref: '/',
    children: [
      {
        linkName: 'Orders',
        linkHref: '/account/orders',
      }, {
        linkName: 'Wishlist',
        linkHref: '/account/wishlist',
      }, {
        linkName: 'Account',
        linkHref: '/account',
      }
    ]
  },
  {
    linkName: 'Pages',
    linkHref: '/',
    children: [
      {
        linkName: 'Membership',
        linkHref: '/',
      }, {
        linkName: 'Incentive Program',
        linkHref: '/',
      }, {
        linkName: 'Influencer Program',
        linkHref: '/',
      }
    ]
  }
];

/* ORDER */
export const ORDER_STAGES = {
  ATTEMPTED: 'attempted',
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  PAID: 'paid',
  SHIPPED: 'shipped',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  RETURNED_IN_PROGRESS: 'return in progress',
  REPLACEMENT: 'replacement',
  REPLACEMENT_IN_PROGRESS: 'replacement in progress',
  REFUNDED: 'refunded',
};

export const ORDER_REQUEST_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  CLOSED: 'closed',
};

export const ORDER_REQUEST_TYPES = {
  RETURN: 'return',
  REPLACE: 'replace',
  CANCEL: 'cancel',
};

export const PAYMENT_METHODS = {
  CARD: 'card',
  NET_BAKING: 'netbanking',
  WALLET: 'wallet',
  EMI: 'emi',
  UPI: 'upi',
  COD: 'cod',
};

export const CANCELLATION_REASONS = [
  `No longer needed`,
  `I've changed my mind`,
  `Being delivered to wrong address`,
  `It was an impulse purchase`,
  `Delivery date keeps changing`,
  `Found a better deal elsewhere`,
  `Heard bad review from friends/relatives after ordering the product`,
  `Not available to receive the package. Travelling or moving.`,
  `Bad customer care service or representative`,
];

export const RETURN_REASONS = [
  `Incorrect product`,
  `No longer needed`,
  `Did not meet my expectations`,
  `Quality is not upto the mark`,
  `It was damaged or defective`,
  `Not delivered on time`,
  `Found a better deal elsewhere`,
];

export const GIFT_PACKAGES = [
  {title: 'Basic', cost: 49, details: 'Includes special gift wrapping'},
  {title: 'Standard', cost: 79, details: 'Includes special gift wrapping and a premium bookmark'},
  {title: 'Premium', cost: 99, details: 'Includes special gift wrapping, premium bookmark, cookies and chocolates'},
];

export const TRACKING_LINK = (trackingId: string) => `https://www.delhivery.com/track/package/${trackingId}`;
