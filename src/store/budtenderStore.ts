import { create } from 'zustand';
import { Product } from '../lib/types';
import { Product as PremiumProduct, Review } from '../types/premiumProduct';

interface BudtenderStore {
  isVoiceOpen: boolean;
  activeProduct: (PremiumProduct & { reviews: Review[]; relatedProducts?: Product[] }) | null;
  openVoice: () => void;
  closeVoice: () => void;
  toggleVoice: () => void;
  setActiveProduct: (product: (PremiumProduct & { reviews: Review[]; relatedProducts?: Product[] }) | null) => void;
}

export const useBudtenderStore = create<BudtenderStore>((set) => ({
  isVoiceOpen: false,
  activeProduct: null,
  openVoice: () => set({ isVoiceOpen: true }),
  closeVoice: () => set({ isVoiceOpen: false }),
  toggleVoice: () => set((state) => ({ isVoiceOpen: !state.isVoiceOpen })),
  setActiveProduct: (product) => set({ activeProduct: product }),
}));
