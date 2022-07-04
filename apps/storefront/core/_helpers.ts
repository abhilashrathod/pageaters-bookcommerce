export const currencyFormat = (num: number) => {
  return num ? `₹${num.toFixed(2)}` : `₹0`;
};

export const returnDiscountedAmount = (price: number, discount: number) => {
  return Math.floor((price - (discount * price) / 100));
};

export const returnDiscountAmount = (price: number, discount: number) => {
  return Math.ceil((discount * price) / 100);
};

export const returnReadingHours = (value: any) => {
  const totalMinutes = value / 0.5;
  const hours = Math.ceil((totalMinutes / 60));

  return `${hours} hours`;
};

export const obscureEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return `${name[0]}${new Array(name.length).join("*")}@${domain}`;
};
