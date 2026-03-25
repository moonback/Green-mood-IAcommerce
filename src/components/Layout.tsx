import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AgeGate from "./AgeGate";
import CartSidebar from "./CartSidebar";
import BudTender from "./BudTender";
import LoyaltyCard from "./LoyaltyCard";
import ToastContainer from "./Toast";
import Header from "./layout/HeaderV2";
import Footer from "./layout/Footer";
import PredictiveSearch from "./layout/PredictiveSearch";
import MobileTabBar from "./layout/MobileTabBar";
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "../store/settingsStore";

export default function Layout() {
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  const { user, profile } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);

  // Hide header/footer/mobile tab bar on auth pages for a cleaner focused flow
  const authPaths = ['/connexion', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe'];
  const isAuthPage = authPaths.includes(location.pathname);
  const isCheckoutFlow = location.pathname.startsWith('/commande');
  const isProductDetailPage = /^\/catalogue\/[^/]+$/.test(location.pathname);
  const shouldShowMobileTabBar = !isAuthPage && !isCheckoutFlow && !isProductDetailPage;

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--color-bg)] text-[color:var(--color-text)] font-sans selection:bg-[color:var(--color-primary)]/20 selection:text-[color:var(--color-primary-contrast)] transition-colors duration-300">
      <AgeGate />
      <CartSidebar />
      {user && location.pathname !== '/assistant' && ((!settings) || (settings.budtender_chat_enabled !== false) || (settings.budtender_voice_enabled !== false)) && (
        <div className="hidden md:block">
          <BudTender />
        </div>
      )}
      <ToastContainer />

      {!isAuthPage && (
        <Header 
          setIsSearchOpen={setIsSearchOpen} 
          setIsLoyaltyModalOpen={setIsLoyaltyModalOpen} 
        />
      )}

      {/* Loyalty Card Modal */}
      <AnimatePresence>
        {isLoyaltyModalOpen && user && profile && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoyaltyModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md z-10"
            >
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => setIsLoyaltyModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.4em] mb-6">VOTRE CARTE FIDÉLITÉ</p>
                <LoyaltyCard
                  userId={user.id}
                  fullName={profile.full_name || 'Client'}
                  points={profile.loyalty_points}
                  referralCode={profile.referral_code}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className={`flex-grow relative ${shouldShowMobileTabBar ? 'pb-20 md:pb-0' : ''}`}>
        <Outlet />
      </main>

      {!isAuthPage && !isProductDetailPage && <Footer />}
      {shouldShowMobileTabBar && <MobileTabBar />}

      <PredictiveSearch isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />
    </div>
  );
}
