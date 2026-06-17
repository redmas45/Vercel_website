import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { VoiceOrb } from './components/layout/VoiceOrb';
import { CartDrawer } from './components/cart/CartDrawer';
import { useVoiceWidget } from './hooks/useVoiceWidget';
import { Home } from './pages/Home';
import { ShopListing } from './pages/ShopListing';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';

function AppShell() {
  const { orbState } = useVoiceWidget();

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopListing />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
      <Footer />
      <CartDrawer />
      <VoiceOrb state={orbState} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
