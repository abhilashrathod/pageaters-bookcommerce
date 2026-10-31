// Display prices. The discount rule matches the API's cart pricing (cart-pricing.service.js): floor(price − d% of price).
export const discountedPrice = (price: number, discount = 0) => Math.floor(price - (discount * price) / 100);

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatPrice = (amount: number) => inr.format(amount);
