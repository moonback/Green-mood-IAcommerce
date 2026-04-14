import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Address, Category, Product, Profile, UserAIPreferences } from '../../../../lib/types';
import { useCustomerDisplayChannel } from '../../../../hooks/useCustomerDisplayChannel';
import { useSettingsStore } from '../../../../store/settingsStore';
import { useToastStore } from '../../../../store/toastStore';
import { openCustomerDisplay } from '../../../../lib/openCustomerDisplay';
import { AppliedPromo, CartLine, CompletedSale, DailyReport, PaymentMethod } from '../types';
import { AdminPOSTabProps, HistoryDaySummary, POSCatalogData, POSComputedValues, POSDisplayInfo, POSViewSetters, POSViewState } from './types';
import { buildDailyReport, computeCartMetrics, filterPOSProducts, getBusinessDate, getBusinessDayRange } from './utils';

interface UseAdminPOSReturn {
  catalog: POSCatalogData;
  computed: POSComputedValues;
  display: POSDisplayInfo;
  setters: POSViewSetters;
  state: POSViewState;
  actions: {
    addToCart: (product: Product) => void;
    updateQty: (productId: string, delta: number) => void;
    updatePrice: (productId: string, price: string) => void;
    removeLine: (productId: string) => void;
    clearCart: () => void;
    handleApplyPromo: () => Promise<void>;
    loadProducts: () => Promise<void>;
    loadTodayStats: () => Promise<void>;
    processSale: () => Promise<void>;
    handleGenerateReport: (mode?: 'view' | 'close') => Promise<void>;
    finalizeClose: () => Promise<void>;
    loadHistory: () => Promise<void>;
    handleViewPastReport: (dateStr: string) => Promise<void>;
    toggleFullScreen: () => void;
    openCustomerDisplay: () => void;
  };
}

export function useAdminPOS({ storeName, storeAddress, storePhone }: AdminPOSTabProps): UseAdminPOSReturn {
  const { settings } = useSettingsStore();
  const { addToast } = useToastStore();
  const { broadcastCartUpdate } = useCustomerDisplayChannel();

  const resolvedStoreName = storeName || settings.store_name || 'Eco CBD';
  const resolvedStoreAddress = storeAddress || settings.store_address || '123 Rue de la Nature, 75000 Paris';
  const resolvedStorePhone = storePhone || settings.store_phone || '01 23 45 67 89';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [posStep, setPosStep] = useState<'client' | 'category' | 'products'>('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<DailyReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportMode, setReportMode] = useState<'view' | 'close'>('view');
  const [cashCounted, setCashCounted] = useState('');
  const [isSessionClosed, setIsSessionClosed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDays, setHistoryDays] = useState<HistoryDaySummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUnlockedManually, setIsUnlockedManually] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [selectedCustomerAIPreferences, setSelectedCustomerAIPreferences] = useState<UserAIPreferences | null>(null);
  const [selectedCustomerDefaultAddress, setSelectedCustomerDefaultAddress] = useState<Address | null>(null);
  const [selectedCustomerOrderCount, setSelectedCustomerOrderCount] = useState(0);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const [showTodayTotal, setShowTodayTotal] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);

  const scanBuffer = useRef('');
  const lastScanTime = useRef(0);

  const computed = useMemo(() => {
    const metrics = computeCartMetrics({
      cart,
      discountType,
      discountValue,
      useLoyaltyPoints,
      pointsToRedeem,
      loyaltyRedeemRate: settings.loyalty_redeem_rate || 5,
      appliedPromo,
      cashGiven,
    });

    return {
      ...metrics,
      filteredProducts: filterPOSProducts(products, searchQuery, selectedCategory),
    };
  }, [appliedPromo, cart, cashGiven, discountType, discountValue, pointsToRedeem, products, searchQuery, selectedCategory, settings.loyalty_redeem_rate, useLoyaltyPoints]);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    setProducts((prods as Product[]) ?? []);
    setCategories((cats as Category[]) ?? []);
    setIsLoadingProducts(false);
  }, []);

  const loadTodayStats = useCallback(async () => {
    const businessDate = getBusinessDate();
    const { start, end } = getBusinessDayRange(businessDate);

    const { data: sales } = await supabase
      .from('orders')
      .select('total')
      .eq('delivery_type', 'in_store')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());

    if (sales) {
      setTodayTotal(sales.reduce((sum, order) => sum + order.total, 0));
    }

    const { data: report } = await supabase
      .from('pos_reports')
      .select('id')
      .eq('date', businessDate)
      .maybeSingle();

    setIsSessionClosed(Boolean(report));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountValue('');
    setCashGiven('');
    setPaymentMethod('cash');
    setSelectedCustomer(null);
    setUseLoyaltyPoints(false);
    setPointsToRedeem(0);
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
    setPosStep('client');
    setIsCartVisible(false);
  }, []);

  const addToCart = useCallback((product: Product) => {
    setCart((currentCart) => {
      const existingLine = currentCart.find((line) => line.product.id === product.id);
      if (existingLine) {
        if (existingLine.quantity >= product.stock_quantity) {
          addToast({ type: 'error', message: `Stock insuffisant pour ${product.name} (Max: ${product.stock_quantity})` });
          return currentCart;
        }

        return currentCart.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      }

      return [...currentCart, { product, quantity: 1, unitPrice: product.price }];
    });
  }, [addToast]);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((currentCart) => currentCart
      .map((line) => line.product.id === productId
        ? { ...line, quantity: Math.max(0, Math.min(line.quantity + delta, line.product.stock_quantity)) }
        : line)
      .filter((line) => line.quantity > 0));
  }, []);

  const updatePrice = useCallback((productId: string, price: string) => {
    const parsedPrice = Number.parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return;
    }

    setCart((currentCart) => currentCart.map((line) => line.product.id === productId ? { ...line, unitPrice: parsedPrice } : line));
  }, []);

  const removeLine = useCallback((productId: string) => {
    setCart((currentCart) => currentCart.filter((line) => line.product.id !== productId));
  }, []);

  const handleApplyPromo = useCallback(async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    setIsCheckingPromo(true);
    setPromoError('');

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        setPromoError('Code promo invalide ou inactif.');
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError('Ce code promo a expiré.');
        return;
      }
      if (data.max_uses != null && data.uses_count >= data.max_uses) {
        setPromoError("Ce code promo a atteint son nombre maximal d'utilisations.");
        return;
      }
      if (computed.subtotal < data.min_order_value) {
        setPromoError(`Montant minimum requis : ${data.min_order_value.toFixed(2)} €`);
        return;
      }

      const discountAmount = data.discount_type === 'percent'
        ? Math.min(computed.subtotal, (computed.subtotal * data.discount_value) / 100)
        : Math.min(computed.subtotal, data.discount_value);

      setAppliedPromo({
        code: data.code,
        description: data.description,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        discount_amount: discountAmount,
      });
      setPromoInput('');
    } catch {
      setPromoError('Erreur lors de la vérification du code.');
    } finally {
      setIsCheckingPromo(false);
    }
  }, [computed.subtotal, promoInput]);

  const handleScan = useCallback(async (sku: string) => {
    if (!sku || sku.length < 3) return;

    const matchingProduct = products.find((product) => product.sku === sku);
    if (matchingProduct) {
      addToCart(matchingProduct);
      return;
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      addToCart(data as Product);
    }
  }, [addToCart, products]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data: reports, error } = await supabase.from('pos_reports').select('*').order('date', { ascending: false }).limit(30);
      if (error) throw error;
      setHistoryDays((reports || []).map((report) => ({ date: report.date, total: report.total_sales, count: report.order_count })));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const handleGenerateReport = useCallback(async (mode: 'view' | 'close' = 'view') => {
    setIsGeneratingReport(true);
    setReportMode(mode);
    const businessDate = getBusinessDate();
    const { start, end } = getBusinessDayRange(businessDate);

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, notes, delivery_type, order_items (quantity, product_name, total_price)')
        .eq('delivery_type', 'in_store')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (error) throw error;

      setReportData(buildDailyReport((orders || []) as any, new Date()));
      setShowReportModal(true);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', message: 'Erreur lors de la génération du rapport.' });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [addToast]);

  const handleViewPastReport = useCallback(async (dateStr: string) => {
    setIsGeneratingReport(true);
    setReportMode('view');

    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, notes, delivery_type, order_items (quantity, product_name, total_price)')
        .eq('delivery_type', 'in_store')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;
      setReportData(buildDailyReport((orders || []) as any, new Date(dateStr)));
      setShowReportModal(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  const finalizeClose = useCallback(async () => {
    if (!reportData) return;
    if (!window.confirm("Confirmer la CLÔTURE DÉFINITIVE de la journée ? \n\nCette action enregistrera le rapport Z en base de données et bloquera les ventes jusqu'à demain.")) {
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('pos_reports').upsert({
        date: getBusinessDate(),
        total_sales: reportData.totalSales,
        cash_total: reportData.cashTotal,
        card_total: reportData.cardTotal,
        mobile_total: reportData.mobileTotal,
        items_sold: reportData.itemsSold,
        order_count: reportData.orderCount,
        product_breakdown: reportData.productBreakdown,
        cash_counted: Number.parseFloat(cashCounted) || 0,
        cash_difference: (Number.parseFloat(cashCounted) || 0) - reportData.cashTotal,
        closed_at: new Date().toISOString(),
        closed_by: user?.id,
      }, { onConflict: 'date' });

      if (error) throw error;
      setIsSessionClosed(true);
      setShowReportModal(false);
      addToast({ type: 'success', message: 'Session clôturée avec succès et enregistrée en base de données.' });
      await loadHistory();
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', message: 'Erreur lors de la clôture en base de données.' });
    } finally {
      setIsProcessing(false);
    }
  }, [addToast, cashCounted, loadHistory, reportData]);

  const processSale = useCallback(async () => {
    if (cart.length === 0) return;
    if (isSessionClosed && !isUnlockedManually) {
      addToast({ type: 'error', message: 'La session de caisse est clôturée. Déverrouillez manuellement ou attendez 06:00.' });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: selectedCustomer?.id || null,
        delivery_type: 'in_store',
        address_id: null,
        subtotal: computed.subtotal,
        delivery_fee: 0,
        total: computed.total,
        promo_discount: computed.discount + computed.loyaltyDiscount + computed.promoDiscount,
        promo_code: appliedPromo?.code ?? ((computed.discount > 0 || computed.loyaltyDiscount > 0)
          ? `POS-REMISE-${computed.discount > 0 ? (discountType === 'percent' ? `${discountValue}%` : `${discountValue}EUR`) : ''}${computed.loyaltyDiscount > 0 ? `-LOYALTY-${pointsToRedeem}PTS` : ''}`
          : null),
        loyalty_points_earned: Math.floor(computed.total),
        payment_status: 'paid',
        status: 'delivered',
        notes: `[POS] Vente en boutique${selectedCustomer ? ` (Client: ${selectedCustomer.full_name})` : ''} — Paiement: ${paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'card' ? 'Carte' : 'Mobile'}`,
      }).select().single();

      if (orderError || !order) throw new Error('Erreur création commande');

      await supabase.from('order_items').insert(cart.map((line) => ({
        order_id: order.id,
        product_id: line.product.id,
        product_name: line.product.name,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        total_price: line.quantity * line.unitPrice,
      })));

      if (appliedPromo) {
        await supabase.rpc('increment_promo_uses', { code_text: appliedPromo.code });
      }

      for (const line of cart) {
        if (line.product.is_bundle) {
          const { data: components } = await supabase.from('bundle_items').select('product_id, quantity').eq('bundle_id', line.product.id);
          if (components) {
            for (const component of components) {
              const totalQuantity = component.quantity * line.quantity;
              const { data: componentProduct } = await supabase.from('products').select('stock_quantity').eq('id', component.product_id).single();
              if (componentProduct) {
                await supabase.from('products').update({ stock_quantity: Math.max(0, componentProduct.stock_quantity - totalQuantity) }).eq('id', component.product_id);
                await supabase.from('stock_movements').insert({
                  product_id: component.product_id,
                  quantity_change: -totalQuantity,
                  type: 'sale',
                  note: `[POS] Bundle component #${order.id.slice(0, 8).toUpperCase()}`,
                });
              }
            }
          }
          await supabase.rpc('sync_bundle_stock', { p_bundle_id: line.product.id });
        } else {
          const newStock = Math.max(0, line.product.stock_quantity - line.quantity);
          await supabase.from('products').update({ stock_quantity: newStock }).eq('id', line.product.id);
          await supabase.from('stock_movements').insert({
            product_id: line.product.id,
            quantity_change: -line.quantity,
            type: 'sale',
            note: `[POS] Vente boutique #${order.id.slice(0, 8).toUpperCase()}`,
          });
        }
      }

      if (selectedCustomer) {
        // Point awarding and deductions are now handled by the database trigger
        // when payment_status is set to 'paid'.
        // This avoids code duplication and ensures points are awarded even 
        // if the sale comes from elsewhere.
      }

      const sale: CompletedSale = {
        orderId: order.id,
        shortId: order.id.slice(0, 8).toUpperCase(),
        lines: [...cart],
        subtotal: computed.subtotal,
        discount: computed.discount,
        promoCode: appliedPromo?.code,
        promoDiscount: computed.promoDiscount > 0 ? computed.promoDiscount : undefined,
        total: computed.total,
        paymentMethod,
        cashGiven: paymentMethod === 'cash' ? computed.cashNum : undefined,
        change: paymentMethod === 'cash' ? computed.change : undefined,
        timestamp: new Date(),
        loyaltyGained: selectedCustomer ? Math.floor(computed.total * (settings.loyalty_earn_rate || 1)) : 0,
        loyaltyRedeemed: useLoyaltyPoints ? pointsToRedeem : 0,
      };

      clearCart();
      setShowPaymentModal(false);
      setCompletedSale(sale);
      await Promise.all([loadTodayStats(), loadProducts()]);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', message: 'Erreur lors de la vente. Vérifiez la console.' });
    } finally {
      setIsProcessing(false);
    }
  }, [addToast, appliedPromo, cart, clearCart, computed, discountType, discountValue, isSessionClosed, isUnlockedManually, loadProducts, loadTodayStats, paymentMethod, pointsToRedeem, selectedCustomer, settings.loyalty_earn_rate, settings.loyalty_tiers, useLoyaltyPoints]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      return;
    }
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadTodayStats();
  }, [loadProducts, loadTodayStats]);

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [loadHistory, showHistory]);

  useEffect(() => {
    if (!selectedCustomer) {
      setSelectedCustomerAIPreferences(null);
      setSelectedCustomerDefaultAddress(null);
      setSelectedCustomerOrderCount(0);
      return;
    }

    const fetchCustomerData = async () => {
      const [{ data: aiData }, { data: addressData }, { count }] = await Promise.all([
        supabase.from('user_ai_preferences').select('*').eq('user_id', selectedCustomer.id).maybeSingle(),
        supabase.from('addresses').select('*').eq('user_id', selectedCustomer.id).eq('is_default', true).maybeSingle(),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', selectedCustomer.id),
      ]);

      setSelectedCustomerAIPreferences(aiData as UserAIPreferences | null);
      setSelectedCustomerDefaultAddress(addressData as Address | null);
      setSelectedCustomerOrderCount(count || 0);
    };

    fetchCustomerData();
  }, [selectedCustomer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastScanTime.current > 50) {
        scanBuffer.current = '';
      }
      lastScanTime.current = currentTime;

      if (event.key === 'Enter') {
        if (scanBuffer.current.length >= 3) {
          void handleScan(scanBuffer.current);
          scanBuffer.current = '';
          event.preventDefault();
        }
        return;
      }

      if (event.key.length === 1) {
        scanBuffer.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan]);

  useEffect(() => {
    const customerDisplayCart = cart.map((line) => ({
      id: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    }));

    broadcastCartUpdate(customerDisplayCart, {
      customerName: selectedCustomer?.full_name || selectedCustomer?.email || null,
      customerEmail: selectedCustomer?.email || null,
      loyaltyPointsBalance: selectedCustomer?.loyalty_points || 0,
      loyaltyPointsUsed: useLoyaltyPoints ? pointsToRedeem : 0,
      promoDiscount: appliedPromo?.discount_amount || 0,
      promoCode: appliedPromo?.code || null,
      manualDiscountValue: Number.parseFloat(discountValue) || 0,
      manualDiscountType: discountType,
      subtotal: computed.subtotal,
      total: computed.total,
      businessDate: getBusinessDate(),
    });
  }, [appliedPromo, broadcastCartUpdate, cart, computed.subtotal, computed.total, discountType, discountValue, pointsToRedeem, selectedCustomer, useLoyaltyPoints]);

  return {
    catalog: { products, categories },
    computed,
    display: { resolvedStoreName, resolvedStoreAddress, resolvedStorePhone },
    setters: {
      setSelectedCategory,
      setPosStep,
      setSearchQuery,
      setDiscountType,
      setDiscountValue,
      setPaymentMethod,
      setCashGiven,
      setShowPaymentModal,
      setSelectedCustomer,
      setShowCustomerDetail,
      setUseLoyaltyPoints,
      setPointsToRedeem,
      setShowReportModal,
      setCashCounted,
      setShowHistory,
      setIsUnlockedManually,
      setShowUnlockModal,
      setUnlockPin,
      setUnlockError,
      setShowAdminMenu,
      setPromoInput,
      setAppliedPromo,
      setPromoError,
      setIsLightTheme,
      setShowAIPreferences,
      setShowTodayTotal,
      setCompletedSale,
      setIsCartVisible,
      setCart,
    },
    state: {
      selectedCategory,
      posStep,
      searchQuery,
      isLoadingProducts,
      cart,
      discountType,
      discountValue,
      paymentMethod,
      cashGiven,
      showPaymentModal,
      isProcessing,
      selectedCustomer,
      showCustomerDetail,
      useLoyaltyPoints,
      pointsToRedeem,
      showReportModal,
      reportData,
      isGeneratingReport,
      reportMode,
      cashCounted,
      isSessionClosed,
      showHistory,
      historyDays,
      isLoadingHistory,
      isUnlockedManually,
      showUnlockModal,
      unlockPin,
      unlockError,
      showAdminMenu,
      promoInput,
      appliedPromo,
      promoError,
      isCheckingPromo,
      isLightTheme,
      selectedCustomerAIPreferences,
      selectedCustomerDefaultAddress,
      selectedCustomerOrderCount,
      showAIPreferences,
      showTodayTotal,
      todayTotal,
      completedSale,
      isCartVisible,
    },
    actions: {
      addToCart,
      updateQty,
      updatePrice,
      removeLine,
      clearCart,
      handleApplyPromo,
      loadProducts,
      loadTodayStats,
      processSale,
      handleGenerateReport,
      finalizeClose,
      loadHistory,
      handleViewPastReport,
      toggleFullScreen,
      openCustomerDisplay,
    },
  };
}
