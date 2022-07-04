import {IBook} from "../schemas/book";
import {get} from 'lodash';
import {returnDiscountAmount, returnDiscountedAmount} from "./_helpers";
import {ICart} from "../schemas/cart";
import {IOrder} from "../schemas/order";

export const GA_TRACKING_ID = 'G-E4NG6F1RZS';

declare global {
  interface Window {
    gtag: any;
  }
}

export const GOOGLE_ANALYTICS_EVENTS = {
  CURRENCY: 'INR',
  GENERAL: {
    LOGIN: 'login',
    REGISTER: 'sign_up',
    SEARCH: 'search'
  },
  VIEW_AND_INTERACTIONS: {
    VIEW_ITEM_LIST: 'view_item_list',
    VIEW_ITEM: 'view_item'
  },
  SHOPPING_CART_INTERACTIONS: {
    ADD_TO_CART: 'add_to_cart',
    REMOVE_FROM_CART: 'remove_from_cart',
    ADD_TO_WISHLIST: 'add_to_wishlist',
    VIEW_CART: 'view_cart',
  },
  CHECKOUT: {
    BEGIN_CHECKOUT: 'begin_checkout',
    ADD_SHIPPING_INFO: 'add_shipping_info',
    PURCHASE: 'purchase',
  },
  PROMOTIONS: {
    VIEW_PROMOTION: 'view_promotion',
    SELECT_PROMOTION: 'select_promotion',
  }
};

export const pageview = (url: string) => {
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  })
};

const event = (eventName: string, payload: any) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, {...payload})
  }
};

/** Common user flow interactions */
/************************************************/
export const signIn = () => {
  const evtPayload = {
    method: "email"
  };
  event(GOOGLE_ANALYTICS_EVENTS.GENERAL.LOGIN, evtPayload);
};
export const signUp = () => {
  const evtPayload = {
    method: "email"
  };
  event(GOOGLE_ANALYTICS_EVENTS.GENERAL.REGISTER, evtPayload);
};
export const searchStore = (query: string) => {
  const evtPayload = {
    search_term: query
  };
  event(GOOGLE_ANALYTICS_EVENTS.GENERAL.SEARCH, evtPayload);
};
/************************************************/

/** Product views and interactions */
/************************************************/
export const viewItemList = (products: Array<IBook>, listId: string = '', listName: string = '') => {
  const items = products.map((item: IBook, index: number) => {
    return {
      item_list_id: listId,
      item_list_name: listName,
      item_id: item.bookId,
      item_name: item.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.price, item.currentDiscount),
      index,
      item_category: get(item, 'categories[0].title', ''),
      item_category2: get(item, 'categories[1].title', ''),
      item_category3: get(item, 'categories[2].title', ''),
      price: item.price,
      quantity: item.inventory
    }
  });

  const evtPayload = {
    item_list_id: listId,
    item_list_name: listName,
    items,
  };

  event(GOOGLE_ANALYTICS_EVENTS.VIEW_AND_INTERACTIONS.VIEW_ITEM_LIST, evtPayload);
};
export const viewItem = (singleItem: Array<IBook>, listId: string = '', listName: string = '') => {
  const items = singleItem.map((item: IBook, index: number) => {
    return {
      item_id: item.bookId,
      item_name: item.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.price, item.currentDiscount),
      index,
      item_category: get(item, 'categories[0].title', ''),
      item_category2: get(item, 'categories[1].title', ''),
      item_category3: get(item, 'categories[2].title', ''),
      price: item.price,
      quantity: 1,
      item_list_id: listId,
      item_list_name: listName,
    }
  });
  const evtPayload = {
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    value: returnDiscountedAmount(singleItem[0].price, singleItem[0].currentDiscount),
    items,
  };
  event(GOOGLE_ANALYTICS_EVENTS.VIEW_AND_INTERACTIONS.VIEW_ITEM, evtPayload);
};
/************************************************/

/** CART */
/************************************************/
export const addToCart = (product: any, quantity: number, listId: string = '', listName: string = '') => {
  const payload = {
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    value: returnDiscountedAmount(product.price, product.currentDiscount),
    items: [{
      item_id: product.bookId ? product.bookId : product.bundleId,
      item_name: product.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(product.price, product.currentDiscount),
      index: 0,
      item_category: get(product, 'categories[0].title', ''),
      item_category2: get(product, 'categories[1].title', ''),
      item_category3: get(product, 'categories[2].title', ''),
      price: product.price,
      quantity,
      item_list_id: listId,
      item_list_name: listName,
    }],
  };

  event(GOOGLE_ANALYTICS_EVENTS.SHOPPING_CART_INTERACTIONS.ADD_TO_CART, payload);
};
export const addToWishList = (product: any, quantity: number, listId: string = '', listName: string = '') => {
  const payload = {
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    value: returnDiscountedAmount(product.price, product.currentDiscount),
    items: [{
      item_id: product.bookId,
      item_name: product.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(product.price, product.currentDiscount),
      index: 0,
      item_category: get(product, 'categories[0].title', ''),
      item_category2: get(product, 'categories[1].title', ''),
      item_category3: get(product, 'categories[2].title', ''),
      price: product.price,
      quantity,
      item_list_id: listId,
      item_list_name: listName,
    }],
  };

  event(GOOGLE_ANALYTICS_EVENTS.SHOPPING_CART_INTERACTIONS.ADD_TO_WISHLIST, payload);
};
export const removeFromCart = (item: any, index: number, listId: string = '', listName: string = '') => {
  const payload = {
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    value: item.productTotal,
    items: [{
      item_id: item.product.bookId ? item.product.bookId : item.product.bundleId,
      item_name: item.product.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.product.price, item.product.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.product.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }],
  };

  event(GOOGLE_ANALYTICS_EVENTS.SHOPPING_CART_INTERACTIONS.REMOVE_FROM_CART, payload);
};
export const viewCart = (cart: ICart, listId: string = '', listName: string = '') => {
  let products = cart.products.map((item, index) => {
    return {
      item_id: item.product.bookId,
      item_name: item.product.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.product.price, item.product.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.product.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });
  let bundles = cart.bundles.map((item, index) => {
    return {
      item_id: item.bundle.bundleId,
      item_name: item.bundle.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.bundle.price, item.bundle.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.bundle.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });

  const payload = {
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    value: cart.subTotal,
    items: [...products, ...bundles],
  };

  event(GOOGLE_ANALYTICS_EVENTS.SHOPPING_CART_INTERACTIONS.VIEW_CART, payload);
};
/************************************************/

/** CHECKOUT */
/************************************************/
export const beginCheckout = (cart: ICart, listId: string = '', listName: string = '') => {
  let products = cart.products.map((item, index) => {
    return {
      item_id: item.product.bookId,
      item_name: item.product.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.product.price, item.product.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.product.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });
  let bundles = cart.bundles.map((item, index) => {
    return {
      item_id: item.bundle.bundleId,
      item_name: item.bundle.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.bundle.price, item.bundle.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.bundle.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });

  const payload = {
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    value: cart.subTotal,
    coupon: "",
    items: [...products, ...bundles],
  };

  event(GOOGLE_ANALYTICS_EVENTS.CHECKOUT.BEGIN_CHECKOUT, payload);
};
export const addShippingInfo = (cart: ICart, listId: string = '', listName: string = '') => {
  let products = cart.products.map((item, index) => {
    return {
      item_id: item.product.bookId,
      item_name: item.product.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.product.price, item.product.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.product.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });
  let bundles = cart.bundles.map((item, index) => {
    return {
      item_id: item.bundle.bundleId,
      item_name: item.bundle.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.bundle.price, item.bundle.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.bundle.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });

  const payload = {
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    value: cart.subTotal,
    coupon: "",
    shipping_tier: "surface",
    items: [...products, ...bundles],
  };

  event(GOOGLE_ANALYTICS_EVENTS.CHECKOUT.ADD_SHIPPING_INFO, payload);
};
export const completePurchase = (cart: ICart, order: IOrder, listId: string = '', listName: string = '') => {
  let products = cart.products.map((item, index) => {
    return {
      item_id: item.product.bookId,
      item_name: item.product.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.product.price, item.product.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.product.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });
  let bundles = cart.bundles.map((item, index) => {
    return {
      item_id: item.bundle.bundleId,
      item_name: item.bundle.title,
      affiliation: "Pageaters",
      currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
      discount: returnDiscountAmount(item.bundle.price, item.bundle.currentDiscount),
      index,
      item_category: '',
      item_category2: '',
      item_category3: '',
      price: item.bundle.price,
      quantity: item.quantity,
      item_list_id: listId,
      item_list_name: listName,
    }
  });

  const payload = {
    transaction_id: order.orderId,
    affiliation: "Pageaters",
    value: order.total,
    tax: 0,
    shipping: order.shipping,
    currency: GOOGLE_ANALYTICS_EVENTS.CURRENCY,
    coupon: "",
    items: [...products, ...bundles],
  };

  event(GOOGLE_ANALYTICS_EVENTS.CHECKOUT.PURCHASE, payload);
};
/************************************************/
