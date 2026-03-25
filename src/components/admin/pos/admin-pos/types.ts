import { Dispatch, SetStateAction } from 'react';
import { Address, Category, Product, Profile, UserAIPreferences } from '../../../../lib/types';
import { AppliedPromo, CartLine, CompletedSale, DailyReport, PaymentMethod } from '../types';

export interface AdminPOSTabProps {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  onExit?: () => void;
}

export interface HistoryDaySummary {
  date: string;
  total: number;
  count: number;
}

export interface POSComputedValues {
  subtotal: number;
  discount: number;
  loyaltyDiscount: number;
  promoDiscount: number;
  total: number;
  cashNum: number;
  change: number;
  filteredProducts: Product[];
  cartItemCount: number;
}

export interface POSDisplayInfo {
  resolvedStoreName: string;
  resolvedStoreAddress: string;
  resolvedStorePhone: string;
}

export interface POSViewState {
  selectedCategory: string;
  posStep: 'client' | 'category' | 'products';
  searchQuery: string;
  isLoadingProducts: boolean;
  cart: CartLine[];
  discountType: 'percent' | 'fixed';
  discountValue: string;
  paymentMethod: PaymentMethod;
  cashGiven: string;
  showPaymentModal: boolean;
  isProcessing: boolean;
  selectedCustomer: Profile | null;
  showCustomerDetail: boolean;
  useLoyaltyPoints: boolean;
  pointsToRedeem: number;
  showReportModal: boolean;
  reportData: DailyReport | null;
  isGeneratingReport: boolean;
  reportMode: 'view' | 'close';
  cashCounted: string;
  isSessionClosed: boolean;
  showHistory: boolean;
  historyDays: HistoryDaySummary[];
  isLoadingHistory: boolean;
  isUnlockedManually: boolean;
  showUnlockModal: boolean;
  unlockPin: string;
  unlockError: boolean;
  showAdminMenu: boolean;
  promoInput: string;
  appliedPromo: AppliedPromo | null;
  promoError: string;
  isCheckingPromo: boolean;
  isLightTheme: boolean;
  selectedCustomerAIPreferences: UserAIPreferences | null;
  selectedCustomerDefaultAddress: Address | null;
  selectedCustomerOrderCount: number;
  showAIPreferences: boolean;
  showTodayTotal: boolean;
  todayTotal: number;
  completedSale: CompletedSale | null;
  isCartVisible: boolean;
}

export interface POSViewSetters {
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  setPosStep: Dispatch<SetStateAction<'client' | 'category' | 'products'>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setDiscountType: Dispatch<SetStateAction<'percent' | 'fixed'>>;
  setDiscountValue: Dispatch<SetStateAction<string>>;
  setPaymentMethod: Dispatch<SetStateAction<PaymentMethod>>;
  setCashGiven: Dispatch<SetStateAction<string>>;
  setShowPaymentModal: Dispatch<SetStateAction<boolean>>;
  setSelectedCustomer: Dispatch<SetStateAction<Profile | null>>;
  setShowCustomerDetail: Dispatch<SetStateAction<boolean>>;
  setUseLoyaltyPoints: Dispatch<SetStateAction<boolean>>;
  setPointsToRedeem: Dispatch<SetStateAction<number>>;
  setShowReportModal: Dispatch<SetStateAction<boolean>>;
  setCashCounted: Dispatch<SetStateAction<string>>;
  setShowHistory: Dispatch<SetStateAction<boolean>>;
  setIsUnlockedManually: Dispatch<SetStateAction<boolean>>;
  setShowUnlockModal: Dispatch<SetStateAction<boolean>>;
  setUnlockPin: Dispatch<SetStateAction<string>>;
  setUnlockError: Dispatch<SetStateAction<boolean>>;
  setShowAdminMenu: Dispatch<SetStateAction<boolean>>;
  setPromoInput: Dispatch<SetStateAction<string>>;
  setAppliedPromo: Dispatch<SetStateAction<AppliedPromo | null>>;
  setPromoError: Dispatch<SetStateAction<string>>;
  setIsLightTheme: Dispatch<SetStateAction<boolean>>;
  setShowAIPreferences: Dispatch<SetStateAction<boolean>>;
  setShowTodayTotal: Dispatch<SetStateAction<boolean>>;
  setCompletedSale: Dispatch<SetStateAction<CompletedSale | null>>;
  setIsCartVisible: Dispatch<SetStateAction<boolean>>;
  setCart: Dispatch<SetStateAction<CartLine[]>>;
}

export interface POSCatalogData {
  products: Product[];
  categories: Category[];
}
