// Gift-wrap packages offered at checkout: the storefront lists them and sends the chosen `title` as the order's
// `giftOptions.details.package`; the API charges `cost` (whole rupees) for that title and ignores any cost a request
// sends. No zod import, so the storefront can load it alone (`@pageaters/shared/gift-packages`).
export const GIFT_PACKAGES = [
  { title: 'Basic', cost: 49, details: 'Includes special gift wrapping' },
  { title: 'Standard', cost: 79, details: 'Includes special gift wrapping and a premium bookmark' },
  { title: 'Premium', cost: 99, details: 'Includes special gift wrapping, premium bookmark, cookies and chocolates' },
] as const;

export type GiftPackage = (typeof GIFT_PACKAGES)[number];
export type GiftPackageTitle = GiftPackage['title'];
