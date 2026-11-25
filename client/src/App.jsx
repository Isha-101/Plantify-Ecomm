import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import { PageLoading, Protected } from './components/ui.jsx';
import Home from './pages/Home.jsx';

const Shop = lazy(() => import('./pages/Shop.jsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const OrderDetail = lazy(() => import('./pages/OrderDetail.jsx'));
const Login = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Register })));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Matchmaker = lazy(() => import('./pages/Matchmaker.jsx'));
const PlantCare = lazy(() => import('./pages/PlantCare.jsx'));
const GuidePage = lazy(() => import('./pages/GuidePage.jsx'));
const MyGarden = lazy(() => import('./pages/MyGarden.jsx'));
const GardenPlant = lazy(() => import('./pages/GardenPlant.jsx'));
const CareCalendar = lazy(() => import('./pages/CareCalendar.jsx'));
const PlantKits = lazy(() => import('./pages/PlantKits.jsx'));
const RoomPlanner = lazy(() => import('./pages/RoomPlanner.jsx'));
const Info = lazy(() => import('./pages/Info.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
            <Route path="/order-confirmation/:ref" element={<Protected><OrderConfirmation /></Protected>} />
            <Route path="/orders" element={<Protected><Orders /></Protected>} />
            <Route path="/orders/:ref" element={<Protected><OrderDetail /></Protected>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/matchmaker" element={<Matchmaker />} />
            <Route path="/plant-care" element={<PlantCare />} />
            <Route path="/plant-care/:tab" element={<PlantCare />} />
            <Route path="/plant-care/guides/:slug" element={<GuidePage />} />
            <Route path="/garden" element={<Protected><MyGarden /></Protected>} />
            <Route path="/garden/calendar" element={<Protected><CareCalendar /></Protected>} />
            <Route path="/garden/:id" element={<Protected><GardenPlant /></Protected>} />
            <Route path="/kits" element={<PlantKits />} />
            <Route path="/room-planner" element={<RoomPlanner />} />
            <Route path="/about" element={<Info page="about" />} />
            <Route path="/contact" element={<Info page="contact" />} />
            <Route path="/faq" element={<Info page="faq" />} />
            <Route path="/privacy" element={<Info page="privacy" />} />
            <Route path="/terms" element={<Info page="terms" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
