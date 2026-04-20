import { create } from 'zustand';
import { Product } from '../lib/types';
import { Product as PremiumProduct, Review } from '../types/premiumProduct';

interface BudtenderStore {
  isVoiceOpen: boolean;
  activeProduct: (PremiumProduct & { reviews: Review[]; relatedProducts?: Product[] }) | null;
  proactiveGreeting: string | null;
  openVoice: () => void;
  closeVoice: () => void;
  toggleVoice: () => void;
  setActiveProduct: (product: (PremiumProduct & { reviews: Review[]; relatedProducts?: Product[] }) | null) => void;
  setProactiveGreeting: (greeting: string | null) => void;
}

export const useBudtenderStore = create<BudtenderStore>((set) => ({
  isVoiceOpen: false,
  activeProduct: null,
  proactiveGreeting: null,
  openVoice: () => set({ isVoiceOpen: true }),
  closeVoice: () => set({ isVoiceOpen: false }),
  toggleVoice: () => set((state) => ({ isVoiceOpen: !state.isVoiceOpen })),
  setActiveProduct: (product) => set({ activeProduct: product }),
  setProactiveGreeting: (greeting) => set({ proactiveGreeting: greeting }),
}));
