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
import { supabase } from "../lib/supabase";

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
        onAddItem={(product, quantity, subscriptionFrequency) => {
          addItem(product, quantity, subscriptionFrequency);
          openSidebarWithAutoClose();
        }}
        onRemoveItem={(product, quantity, subscriptionFrequency) => {
          if (quantity && quantity > 0) {
            const item = cartItems.find(i => i.product.id === product.id && i.subscriptionFrequency === subscriptionFrequency);
            if (item) {
              const newQty = item.quantity - quantity;
              useCartStore.getState().updateQuantity(product.id, newQty, subscriptionFrequency);
            }
          } else {
            useCartStore.getState().removeItem(product.id, subscriptionFrequency);
          }
          openSidebarWithAutoClose();
        }}
        onUpdateQuantity={(product, quantity, subscriptionFrequency) => {
          useCartStore.getState().updateQuantity(product.id, quantity, subscriptionFrequency);
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
        onApplyPromo={async (code) => {
          const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .maybeSingle();

          if (error || !data) return { success: false, message: "Code promo invalide ou inexistant." };

          const sub = useCartStore.getState().subtotal();
          if (sub < data.min_order_value) {
            return { 
              success: false, 
              message: `Ce code nécessite un minimum de commande de ${parseFloat(data.min_order_value).toFixed(2)} €.` 
            };
          }

          const discount_amount = data.discount_type === 'percent'
            ? Math.min(sub, (sub * parseFloat(data.discount_value)) / 100)
            : Math.min(sub, parseFloat(data.discount_value));

          useCartStore.getState().setAppliedPromo({
            code: data.code,
            description: data.description,
            discount_type: data.discount_type,
            discount_value: parseFloat(data.discount_value),
            discount_amount: parseFloat(discount_amount.toFixed(2))
          });

          return { success: true };
        }}
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
