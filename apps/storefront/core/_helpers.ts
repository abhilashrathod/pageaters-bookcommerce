export const currencyFormat = (num: number) => {
  return '₹' + num.toFixed(2)
};

export const returnDiscountedAmount = (price: number, discount: number) => {
  return Math.floor((price - (discount * price) / 100));
};

export const returnReadingHours = (value: any) => {
  const totalMinutes = value / 0.5;
  const hours = Math.ceil((totalMinutes / 60));

  return `${hours} hours`;
};
