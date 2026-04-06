import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useSettingsStore } from "../store/settingsStore";
import { useBudTenderMemory } from "../hooks/useBudTenderMemory";
import { useWishlistStore } from "../store/wishlistStore";
import { getCachedProducts, getCachedSettings } from "../lib/budtenderCache";
import { Product } from "../lib/types";
import { BudTenderSettings } from "../lib/budtenderSettings";
import { useBudtenderStore } from "../store/budtenderStore";
import ProductCompareModal from "./ProductCompareModal";

// UI Components
import { BudTenderWidget } from "./budtender-ui";
import VoiceAdvisor from "./VoiceAdvisor";

export default function BudTender() {
  const navigate = useNavigate();
  const { addItem, items: cartItems, openSidebar, closeSidebar } = useCartStore();
  const { items: wishlistItems, toggleItem: toggleFavorite } = useWishlistStore();
  const autoCloseTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [comparisonProducts, setComparisonProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  const openSidebarWithAutoClose = useCallback(() => {
    openSidebar();
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      closeSidebar();
    }, 5000);
  }, [openSidebar, closeSidebar]);

  const { settings: globalSettings } = useSettingsStore();

  const {
    isVoiceOpen,
    openVoice,
    closeVoice,
    activeProduct,
  } = useBudtenderStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BudTenderSettings | null>(null);

  const memory = useBudTenderMemory();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, s] = await Promise.all([
          getCachedProducts(),
          getCachedSettings(),
        ]);
        setProducts(p);
        setSettings(s);
      } catch (err) {
        console.error("[BudTender] Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <AnimatePresence>
        {(globalSettings?.budtender_voice_enabled ?? true) && (
          <BudTenderWidget
            onClick={() => openVoice()}
            isVoiceActive={isVoiceOpen}
            budtenderName={globalSettings.budtender_name}
          />
        )}
      </AnimatePresence>

      <VoiceAdvisor
        products={products}
        activeProduct={activeProduct}
        pastProducts={memory.pastProducts}
        pastOrders={memory.pastOrders}
        savedPrefs={memory.savedPrefs}
        userName={memory.userName}
        isOpen={isVoiceOpen}
        cartItems={cartItems}
        customPrompt={settings?.custom_chat_prompt || ""}
        loyaltyPoints={memory.loyaltyPoints}
        allowCloseSession={settings?.voice_close_session_enabled ?? true}
        onClose={() => closeVoice()}
        onHangup={() => closeVoice()}
        onAddItem={(product, quantity) => {
          addItem(product, quantity);
          openSidebarWithAutoClose();
        }}
        onRemoveItem={(product, quantity) => {
          if (quantity && quantity > 0) {
            const item = cartItems.find(i => i.product.id === product.id);
            if (item) {
              const newQty = item.quantity - quantity;
              useCartStore.getState().updateQuantity(product.id, newQty);
            }
          } else {
            useCartStore.getState().removeItem(product.id);
          }
          openSidebarWithAutoClose();
        }}
        onUpdateQuantity={(product, quantity) => {
          useCartStore.getState().updateQuantity(product.id, quantity);
          openSidebarWithAutoClose();
        }}
        onViewProduct={(product) => {
          setComparisonProducts(null);
          navigate(`/catalogue/${product.slug}`);
        }}
        onNavigate={(path) => {
          setComparisonProducts(null);
          navigate(path);
        }}
        onOpenModal={(modalName) => {
          setComparisonProducts(null);
          window.dispatchEvent(new CustomEvent('cortex-open-modal', { detail: modalName }));
        }}
        onSavePrefs={memory.updatePrefs}
        onCompareProducts={(prods) => setComparisonProducts(prods)}
        wishlistItems={wishlistItems}
        onToggleFavorite={toggleFavorite}
        showUI={true}
      />

      <AnimatePresence>
        {comparisonProducts && (
          <ProductCompareModal 
            products={comparisonProducts} 
            onClose={() => setComparisonProducts(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
