import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart } from 'lucide-react';
import POSAIPreferencesModal from '../POSAIPreferencesModal';
import POSCartPanel from '../POSCartPanel';
import POSCategoryGrid from '../POSCategoryGrid';
import POSCustomerDetailModal from '../POSCustomerDetailModal';
import POSCustomerSelection from '../POSCustomerSelection';
import POSPaymentModal from '../POSPaymentModal';
import POSProductGrid from '../POSProductGrid';
import POSReceiptModal from '../POSReceiptModal';
import POSReportModal from '../POSReportModal';
import { useSettingsStore } from '../../../../store/settingsStore';
import { getActiveCategories, getCategoryName } from './utils';
import { AdminPOSTabProps } from './types';
import { useAdminPOS } from './useAdminPOS';
import { AdminPOSHeader } from './AdminPOSHeader';
import { AdminPOSHistoryView } from './AdminPOSHistoryView';
import { AdminPOSSessionClosed } from './AdminPOSSessionClosed';
import { AdminPOSUnlockModal } from './AdminPOSUnlockModal';

interface AdminPOSViewProps extends AdminPOSTabProps {
  pos: ReturnType<typeof useAdminPOS>;
}

export function AdminPOSView({ onExit, pos }: AdminPOSViewProps) {
  const { settings } = useSettingsStore();
  const { actions, catalog, computed, display, setters, state } = pos;
  const { toggleFullScreen } = actions;

  useEffect(() => {
    // Attempt to go fullscreen on mount
    // Note: This may be blocked by browsers if not directly triggered by a user gesture.
    // However, usually the POS is opened via a click which might allow it.
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Fullscreen request failed: ${err.message}`);
      });
    }
  }, []);

  return (
    <div className={`h-full flex flex-col gap-1 sm:gap-2 overflow-hidden relative transition-colors duration-500 ${state.isLightTheme ? 'bg-emerald-50/50' : ''}`}>
      <AdminPOSHeader
        cartLength={state.cart.length}
        isLightTheme={state.isLightTheme}
        onExit={onExit}
        onGenerateReport={(mode) => {
          void actions.handleGenerateReport(mode);
          setters.setShowAdminMenu(false);
        }}
        onLoadProducts={() => void actions.loadProducts()}
        onOpenAIPreferences={() => setters.setShowAIPreferences(true)}
        onOpenCustomerDisplay={() => {
          actions.openCustomerDisplay();
          setters.setShowAdminMenu(false);
        }}
        onToggleAdminMenu={() => setters.setShowAdminMenu((value) => !value)}
        onToggleFullScreen={actions.toggleFullScreen}
        onToggleHistory={() => {
          setters.setShowHistory((value) => !value);
          setters.setShowAdminMenu(false);
        }}
        onToggleTheme={() => setters.setIsLightTheme((value) => !value)}
        onToggleTodayTotal={() => setters.setShowTodayTotal((value) => !value)}
        selectedCustomerHasAI={Boolean(state.selectedCustomer && state.selectedCustomerAIPreferences)}
        settings={{ store_logo_url: settings.store_logo_url, store_logo_dark_url: settings.store_logo_dark_url, store_name: settings.store_name }}
        showAdminMenu={state.showAdminMenu}
        showHistory={state.showHistory}
        showTodayTotal={state.showTodayTotal}
        todayTotal={state.todayTotal}
      />

      {state.isSessionClosed && !state.isUnlockedManually && !state.showHistory && (
        <AdminPOSSessionClosed
          isLightTheme={state.isLightTheme}
          onExit={onExit}
          onOpenHistory={() => setters.setShowHistory(true)}
          onRequestUnlock={() => {
            setters.setUnlockPin('');
            setters.setUnlockError(false);
            setters.setShowUnlockModal(true);
          }}
        />
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-2 lg:gap-4 overflow-hidden min-h-0 relative px-2 sm:px-4 lg:px-0">
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden border rounded-xl sm:rounded-[1.5rem] p-2 sm:p-4 transition-all ${state.isLightTheme ? 'bg-white border-emerald-100 shadow-xl shadow-emerald-100/20' : 'bg-zinc-900/30 border-zinc-800'} ${state.isCartVisible ? 'hidden lg:flex' : 'flex'}`}>
          {state.showHistory ? (
            <AdminPOSHistoryView historyDays={state.historyDays} isLightTheme={state.isLightTheme} isLoadingHistory={state.isLoadingHistory} onClose={() => setters.setShowHistory(false)} onSelectDay={(date) => void actions.handleViewPastReport(date)} />
          ) : state.posStep === 'client' ? (
            <POSCustomerSelection onSelectCustomer={(customer) => {
              setters.setSelectedCustomer(customer);
              setters.setPosStep('category');
            }} onSkip={() => setters.setPosStep('category')} isLightTheme={state.isLightTheme} />
          ) : state.posStep === 'category' ? (
            <POSCategoryGrid
              categories={getActiveCategories(catalog.categories, catalog.products)}
              onSelectCategory={(id) => {
                setters.setSelectedCategory(id);
                setters.setPosStep('products');
              }}
              onBack={() => setters.setPosStep('client')}
              isLightTheme={state.isLightTheme}
            />
          ) : (
            <POSProductGrid
              products={computed.filteredProducts}
              cart={state.cart}
              isLoading={state.isLoadingProducts}
              searchQuery={state.searchQuery}
              setSearchQuery={setters.setSearchQuery}
              onAddToCart={actions.addToCart}
              onBack={() => {
                setters.setPosStep('category');
                setters.setSelectedCategory('all');
                setters.setSearchQuery('');
              }}
              categoryName={getCategoryName(catalog.categories, state.selectedCategory)}
              isLightTheme={state.isLightTheme}
            />
          )}
        </div>

        <POSCartPanel
          isLightTheme={state.isLightTheme}
          isCartVisible={state.isCartVisible}
          setIsCartVisible={setters.setIsCartVisible}
          showHistory={state.showHistory}
          selectedCustomer={state.selectedCustomer}
          setSelectedCustomer={setters.setSelectedCustomer}
          setPosStep={setters.setPosStep}
          setShowCustomerDetail={setters.setShowCustomerDetail}
          selectedCustomerAIPreferences={state.selectedCustomerAIPreferences}
          setShowAIPreferences={setters.setShowAIPreferences}
          useLoyaltyPoints={state.useLoyaltyPoints}
          setUseLoyaltyPoints={setters.setUseLoyaltyPoints}
          pointsToRedeem={state.pointsToRedeem}
          setPointsToRedeem={setters.setPointsToRedeem}
          subtotal={computed.subtotal}
          discount={computed.discount}
          promoDiscount={computed.promoDiscount}
          cart={state.cart}
          setCart={setters.setCart}
          clearCart={actions.clearCart}
          removeLine={actions.removeLine}
          updateQty={actions.updateQty}
          updatePrice={actions.updatePrice}
          categories={catalog.categories}
          discountType={state.discountType}
          setDiscountType={setters.setDiscountType}
          discountValue={state.discountValue}
          setDiscountValue={setters.setDiscountValue}
          promoInput={state.promoInput}
          setPromoInput={setters.setPromoInput}
          promoError={state.promoError}
          setPromoError={setters.setPromoError}
          appliedPromo={state.appliedPromo}
          setAppliedPromo={setters.setAppliedPromo}
          handleApplyPromo={actions.handleApplyPromo}
          isCheckingPromo={state.isCheckingPromo}
          loyaltyDiscount={computed.loyaltyDiscount}
          total={computed.total}
          setShowPaymentModal={setters.setShowPaymentModal}
        />
      </div>

      <POSPaymentModal showPaymentModal={state.showPaymentModal} setShowPaymentModal={setters.setShowPaymentModal} isLightTheme={state.isLightTheme} total={computed.total} paymentMethod={state.paymentMethod} setPaymentMethod={setters.setPaymentMethod} cashGiven={state.cashGiven} setCashGiven={setters.setCashGiven} processSale={actions.processSale} isProcessing={state.isProcessing} />

      <AdminPOSUnlockModal
        isLightTheme={state.isLightTheme}
        showUnlockModal={state.showUnlockModal}
        unlockError={state.unlockError}
        unlockPin={state.unlockPin}
        onClose={() => setters.setShowUnlockModal(false)}
        onUnlock={() => {
          setters.setIsUnlockedManually(true);
          setters.setShowUnlockModal(false);
          setters.setUnlockPin('');
          setters.setUnlockError(false);
        }}
        onUnlockPinChange={setters.setUnlockPin}
        onUnlockErrorChange={setters.setUnlockError}
      />

      {state.completedSale && <POSReceiptModal sale={state.completedSale} storeName={display.resolvedStoreName} storeAddress={display.resolvedStoreAddress} storePhone={display.resolvedStorePhone} onClose={() => {
        setters.setCompletedSale(null);
        setters.setPosStep('client');
        setters.setSelectedCustomer(null);
        setters.setIsCartVisible(false);
      }} isLightTheme={state.isLightTheme} />}

      {state.showCustomerDetail && state.selectedCustomer && <POSCustomerDetailModal customer={state.selectedCustomer} onClose={() => setters.setShowCustomerDetail(false)} isLightTheme={state.isLightTheme} />}
      {state.showReportModal && state.reportData && <POSReportModal reportData={state.reportData} reportMode={state.reportMode} onClose={() => setters.setShowReportModal(false)} onFinalizeClose={actions.finalizeClose} isLightTheme={state.isLightTheme} />}
      {state.showAIPreferences && state.selectedCustomerAIPreferences && state.selectedCustomer && <POSAIPreferencesModal preferences={state.selectedCustomerAIPreferences} customer={state.selectedCustomer} defaultAddress={state.selectedCustomerDefaultAddress} orderCount={state.selectedCustomerOrderCount} products={catalog.products} onAddToCart={actions.addToCart} onViewOrders={() => {
        setters.setShowAIPreferences(false);
        setters.setShowCustomerDetail(true);
      }} onClose={() => setters.setShowAIPreferences(false)} isLightTheme={state.isLightTheme} />}

      {!state.showHistory && !state.isCartVisible && (
        <motion.button initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={() => setters.setIsCartVisible(true)} className={`fixed bottom-6 right-6 lg:hidden z-[100] w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${state.isLightTheme ? 'bg-emerald-600 text-white shadow-emerald-500/40' : 'bg-green-500 text-black shadow-green-500/40'}`}>
          <div className="relative">
            <ShoppingCart className="w-7 h-7" />
            {computed.cartItemCount > 0 && <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{computed.cartItemCount}</span>}
          </div>
        </motion.button>
      )}
    </div>
  );
}
