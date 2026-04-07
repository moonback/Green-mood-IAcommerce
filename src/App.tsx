import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ScrollToTop from "./components/ScrollToTop";
import { useAuthStore } from "./store/authStore";
import { useSettingsStore } from "./store/settingsStore";
import SplashScreen from "./components/SplashScreen";

import { usePageTracker } from "./hooks/usePageTracker";

function PageTracker() {
  usePageTracker();
  return null;
}

const Home = lazy(() => import("./pages/HomeV2"));
const Shop = lazy(() => import("./pages/Shop"));
const Products = lazy(() => import("./pages/Products"));

const Contact = lazy(() => import("./pages/Contact"));
const Legal = lazy(() => import("./pages/Legal"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Catalog = lazy(() => import("./pages/Catalog"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));
const Addresses = lazy(() => import("./pages/Addresses"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const LoyaltyHistory = lazy(() => import("./pages/LoyaltyHistory"));
const MyReviews = lazy(() => import("./pages/MyReviews"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Referrals = lazy(() => import("./pages/Referrals"));
const BirthdayGift = lazy(() => import("./pages/BirthdayGift"));
const POSPage = lazy(() => import("./pages/POSPage"));
const CustomerDisplay = lazy(() => import("./pages/CustomerDisplay"));
const StoreDisplay = lazy(() => import("./pages/StoreDisplay"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Guides = lazy(() => import("./pages/Guides"));
const GuidePage = lazy(() => import("./pages/guides/GuidePage"));
const About = lazy(() => import("./pages/About"));
const Livraison = lazy(() => import("./pages/Livraison"));
const MachineConformity = lazy(() => import("./pages/MachineConformity"));
const CGV = lazy(() => import("./pages/CGV"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
// Assistant page supprimée — seul le mode vocal est conservé

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
      <div className="w-8 h-8 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    const cleanupAuth = initializeAuth();
    return cleanupAuth;
  }, [initializeAuth]);

  useEffect(() => {
    fetchSettings();
    const onFocus = () => {
      fetchSettings(true);
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchSettings]);

  useEffect(() => {
    const name = settings.store_name || 'Ma Boutique';
    document.title = settings.store_tagline ? `${name} | ${settings.store_tagline}` : name;
  }, [settings.store_name, settings.store_tagline]);

  return (
    <BrowserRouter>
      <PageTracker />
      <ScrollToTop />
      <SplashScreen />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Routes admin - Outside of Layout to not have frontend header/footer */}
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<Admin />} />
            <Route path="pos" element={<POSPage />} />
          </Route>

          <Route path="customer-display" element={<CustomerDisplay />} />
          <Route path="afficheur" element={<StoreDisplay />} />
          {/* Route /assistant supprimée — vocal uniquement */}

          <Route path="/" element={<Layout />}>
            {/* Pages publiques */}
            <Route index element={<Home />} />
            <Route path="boutique" element={<Shop />} />
            <Route path="produits" element={<Products />} />

            <Route path="contact" element={<Contact />} />
            <Route path="mentions-legales" element={<Legal />} />
            <Route path="a-propos" element={<About />} />
            <Route path="livraison" element={<Livraison />} />
            <Route path="conformite" element={<MachineConformity />} />
            <Route path="cgv" element={<CGV />} />
            <Route path="politique-de-confidentialite" element={<PrivacyPolicy />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="connexion" element={<Login />} />
            <Route path="mot-de-passe-oublie" element={<ForgotPassword />} />
            <Route path="reinitialiser-mot-de-passe" element={<ResetPassword />} />

            {/* Catalogue en ligne */}
            <Route path="catalogue" element={<Catalog />} />
            <Route path="guides" element={<Guides />} />
            <Route path="guides/:slug" element={<GuidePage />} />

            <Route path="catalogue/:slug" element={<ProductDetail />} />
            <Route path="panier" element={<Cart />} />

            {/* Routes protégées (connexion requise) */}
            <Route element={<ProtectedRoute />}>
              <Route path="commande" element={<Checkout />} />
              <Route path="commande/confirmation" element={<OrderConfirmation />} />
              <Route path="compte" element={<Account />} />
              <Route path="compte/commandes" element={<Orders />} />
              <Route path="compte/adresses" element={<Addresses />} />
              <Route path="compte/abonnements" element={<Subscriptions />} />
              <Route path="compte/fidelite" element={<LoyaltyHistory />} />
              <Route path="compte/avis" element={<MyReviews />} />
              <Route path="compte/favoris" element={<Favorites />} />
              <Route path="compte/parrainage" element={<Referrals />} />
              <Route path="compte/cadeau-anniversaire" element={<BirthdayGift />} />
              <Route path="compte/profil" element={<Profile />} />
            </Route>

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
