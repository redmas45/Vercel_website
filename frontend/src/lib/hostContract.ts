/**
 * Stable, machine-readable markers the storefront publishes for automation and
 * assistants (AI Hub's generic host contract).
 *
 * The AI assistant must not guess at CSS classes or match visible label text to
 * find the search box or the add-to-cart control, and it must be able to verify
 * that an action actually changed the page. These `data-aihub-role` markers and
 * the always-present cart count are the storefront's half of that contract: the
 * website owns them, they are vertical-neutral role names, and they survive
 * restyling because nothing visual depends on them.
 *
 * The assistant never reads the storefront's internal cart store; the DOM
 * markers below and the host-owned React state are the only boundary.
 */

export const AIHUB_ROLE_ATTR = 'data-aihub-role';

export const AIHUB_ROLE = {
  searchForm: 'search-form',
  searchInput: 'search-input',
  searchSubmit: 'search-submit',
  searchResults: 'search-results',
  resultCount: 'result-count',
  resultsLoading: 'results-loading',
  resultsEmpty: 'results-empty',
  addToCart: 'add-to-cart',
  cartButton: 'cart-button',
  cartCount: 'cart-count',
  cartDrawer: 'cart-drawer',
  cartLineItem: 'cart-line-item',
  navLink: 'nav-link',
} as const;

export const AIHUB_NAV_ATTR = 'data-aihub-nav';

export type AihubRole = (typeof AIHUB_ROLE)[keyof typeof AIHUB_ROLE];

/** Spread onto an element to publish its contract role: `{...aihubRole('search-input')}`. */
export function aihubRole(role: AihubRole): Record<string, string> {
  return { [AIHUB_ROLE_ATTR]: role };
}
