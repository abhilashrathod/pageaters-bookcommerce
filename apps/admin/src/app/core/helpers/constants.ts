export const BOOK_VERSIONS = ['hardcover', 'paperback', 'mass market paperback'];
export const READING_LEVELS = ['Beginner', 'Intermediate', 'Advance'];
export const BOOK_AVAILABILITY = ['available', 'procurement', 'import', 'pre-order'];
export const PRODUCT_TYPES =  ['book', 'bundle', 'book_box', 'blind_book', 'mystery_box'];

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


export const ORDER_STATUSES = {
  ATTEMPTED: 'attempted',
  CREATED: 'created',
  PAID: 'paid',
  SHIPPED: 'shipped',
  CONFIRMED: 'confirmed',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REPLACEMENT: 'replacement',
  RETURNED_IN_PROGRESS: 'return in progress',
  REPLACEMENT_IN_PROGRESS: 'replacement in progress',
  REFUNDED: 'refunded',
};

export const returnPercentageValue = (percent, total) => Math.floor((percent / 100) * total);
