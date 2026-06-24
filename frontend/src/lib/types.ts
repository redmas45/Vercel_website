export interface Product {
  id: string;
  handle: string;
  title: string;
  name: string;
  description: string;
  category: string | null;
  subcategory: string | null;
  categories: string[];
  brand: string;
  vendor: string;
  sku: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  currency: string;
  stock: number | null;
  in_stock: boolean;
  image_url: string;
  images: string[];
  rating: number | null;
  review_count: number | null;
  tags: string[];
  specs: Record<string, unknown> | null;
  variants: ProductVariant[] | null;
  related_ids: string[] | null;
  frequently_bought_with: string[] | null;
  highlights: string[] | null;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_bestseller: boolean;
  url: string;
  created_at?: string | null;
}

export interface ProductVariant {
  type: string;
  name: string;
  in_stock?: boolean;
}

export interface FacetRow {
  name: string;
  count: number;
}

export interface ProductListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  facets: {
    brands: FacetRow[];
    price_range: { min: number; max: number };
    categories: FacetRow[];
  };
}

export interface ProductListResponse {
  data: Product[];
  meta?: ProductListMeta | null;
}

export interface ProductDetailResponse {
  data: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Review {
  id: string;
  product_id: string;
  reviewer_name: string;
  rating: number;
  title: string;
  body: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at?: string | null;
  variant_purchased?: string | null;
  is_published: boolean;
}

export interface ReviewListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  average_rating: number;
  rating_breakdown: Record<string, number>;
}

export interface ReviewListResponse {
  data: Review[];
  meta: ReviewListMeta;
}

export interface WishlistItem {
  id: number;
  product: Product;
}

export interface Address {
  id: number;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface PincodeEstimate {
  city: string;
  state: string;
  estimate: string;
  free_delivery: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  created_at?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
