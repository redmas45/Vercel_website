export interface InfoPageContent {
  title: string;
  summary: string;
  sections: readonly [string, string][];
}

export const INFO_PAGES = {
  '/about': {
    title: 'About AI-KART',
    summary: 'AI-KART is a voice-assisted storefront for browsing, comparing, and buying everyday products from a curated catalog.',
    sections: [
      ['Catalog', 'Products are organized by category, price, rating, availability, and offer status so shoppers can narrow choices quickly.'],
      ['Assisted shopping', 'The storefront is designed to work with the connected voice assistant while keeping the standard shopping flow usable on its own.'],
      ['Account tools', 'Customers can manage saved addresses, wishlist items, and shopping history from their account area.'],
    ],
  },
  '/faq': {
    title: 'FAQ',
    summary: 'Answers to common shopping and account questions.',
    sections: [
      ['How do I search?', 'Use the search control in the header or browse categories from the shop page. Filters can narrow results by price, rating, brand, and availability.'],
      ['Do I need an account?', 'Browsing and cart actions work without an account. Wishlist, saved addresses, and account history require sign in.'],
      ['How are offers applied?', 'Eligible product and promo discounts are shown in cart and checkout before the order is placed.'],
    ],
  },
  '/shipping-and-returns': {
    title: 'Shipping & Returns',
    summary: 'Delivery and return details for AI-KART orders.',
    sections: [
      ['Delivery estimates', 'Enter a pincode on product pages to check serviceability and estimated delivery timing.'],
      ['Returns', 'Eligible items can be returned according to the condition and category rules shown during checkout.'],
      ['Support', 'Order issues should be handled from the account area once order persistence is enabled.'],
    ],
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    summary: 'How AI-KART handles customer data in this storefront.',
    sections: [
      ['Account data', 'We use account details for authentication, saved addresses, wishlist actions, and order-related communication.'],
      ['Shopping data', 'Cart and recently viewed items may be stored locally to keep the shopping experience continuous.'],
      ['Third-party services', 'Connected assistant services may process interaction data according to their own service configuration.'],
    ],
  },
  '/terms-and-conditions': {
    title: 'Terms & Conditions',
    summary: 'The basic terms for using the AI-KART storefront.',
    sections: [
      ['Catalog accuracy', 'Prices, availability, offers, and delivery estimates should be confirmed at checkout before purchase.'],
      ['Customer responsibility', 'Customers are responsible for accurate account, address, and payment information.'],
      ['Service changes', 'Storefront features, categories, and assistant capabilities may change as the platform evolves.'],
    ],
  },
} as const satisfies Record<string, InfoPageContent>;
