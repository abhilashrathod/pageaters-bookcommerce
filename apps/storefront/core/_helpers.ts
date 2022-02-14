export const currencyFormat = (num: number) => {
  return '₹' + num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
};

export const returnDiscountedAmount = (price: number, discount: number) => {
  return Math.floor((price - (discount * price) / 100));
};
