import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useSettingsStore } from "../store/settingsStore";
import { useBudTenderMemory } from "../hooks/useBudTenderMemory";
import { getCachedProducts, getCachedSettings } from "../lib/budtenderCache";
import { Product } from "../lib/types";
import { BudTenderSettings } from "../lib/budtenderSettings";
import { useBudtenderStore } from "../store/budtenderStore";

// UI Components
import { BudTenderWidget } from "./budtender-ui";
import VoiceAdvisor from "./VoiceAdvisor";

export default function BudTender() {
  const navigate = useNavigate();
  const { addItem, items: cartItems, openSidebar, closeSidebar } = useCartStore();
  const autoCloseTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
        onViewProduct={(product) => navigate(`/catalogue/${product.slug}`)}
        onNavigate={(path) => navigate(path)}
        onOpenModal={(modalName) => {
          window.dispatchEvent(new CustomEvent('cortex-open-modal', { detail: modalName }));
        }}
        onSavePrefs={memory.updatePrefs}
        showUI={true}
      />
    </>
  );
}
