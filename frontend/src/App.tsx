import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CartDrawer } from './components/cart/CartDrawer';
import { AddedToCartModal } from './components/cart/AddedToCartModal';
import { ToastContainer } from './components/ui/Toast';
import { ToastProvider } from './components/ui/ToastProvider';
import { Home } from './pages/Home';
import { ShopListing } from './pages/ShopListing';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Admin } from './pages/Admin';
import { Account } from './pages/Account';
import { SearchResults } from './pages/SearchResults';
import { AccountWishlist } from './pages/AccountWishlist';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { INFO_PAGES } from './lib/infoPages';
import { InfoPage } from './pages/InfoPage';
import { NotFound } from './pages/NotFound';

function AppShell() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopListing />} />
        <Route path="/new" element={<ShopListing preset="new" />} />
        <Route path="/sale" element={<ShopListing preset="sale" />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/orders" element={<Account />} />
        <Route path="/account/profile" element={<Account />} />
        <Route path="/account/addresses" element={<Account />} />
        <Route path="/account/wishlist" element={<AccountWishlist />} />
        <Route path="/admin" element={<Admin />} />
        {Object.entries(INFO_PAGES).map(([path, content]) => (
          <Route key={path} path={path} element={<InfoPage content={content} />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <CartDrawer />
      <AddedToCartModal />
      <MobileBottomNav />
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  );
}
