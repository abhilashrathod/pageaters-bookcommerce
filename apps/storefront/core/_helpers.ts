export const currencyFormat = (num: number) => {
  // console.log("currencyFormat");
  return '₹' + num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '₹1,')
};

export const returnDiscountedAmount = (price: number, discount: number) => {
  // console.log("returnDiscountedAmount");
  return Math.floor((price - (discount * price) / 100));
};
