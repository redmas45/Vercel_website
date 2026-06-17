export interface Product {
  id: string;
  handle: string;
  title: string;
  name: string;
  description: string;
  category: string | null;
  categories: string[];
  brand: string;
  vendor: string;
  price: number;
  original_price: number | null;
  currency: string;
  stock: number | null;
  in_stock: boolean;
  image_url: string;
  url: string;
}

export interface ProductListResponse {
  data: Product[];
}

export interface ProductDetailResponse {
  data: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
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
