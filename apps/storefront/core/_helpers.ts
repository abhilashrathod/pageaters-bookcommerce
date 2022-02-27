export const currencyFormat = (num: number) => {
  return '₹' + num.toFixed(2)
};

export const returnDiscountedAmount = (price: number, discount: number) => {
  return Math.floor((price - (discount * price) / 100));
};
