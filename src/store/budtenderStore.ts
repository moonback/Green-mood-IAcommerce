import { create } from 'zustand';
import { Product } from '../lib/types';
import { Product as PremiumProduct, Review } from '../types/premiumProduct';

interface BudtenderStore {
  isChatOpen: boolean;
  isVoiceOpen: boolean;
  activeProduct: (PremiumProduct & { reviews: Review[]; relatedProducts?: Product[] }) | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openVoice: () => void;
  closeVoice: () => void;
  toggleVoice: () => void;
  setActiveProduct: (product: (PremiumProduct & { reviews: Review[]; relatedProducts?: Product[] }) | null) => void;
}

export const useBudtenderStore = create<BudtenderStore>((set) => ({
  isChatOpen: false,
  isVoiceOpen: false,
  activeProduct: null,
  openChat: () => set({ isChatOpen: true, isVoiceOpen: false }),
  closeChat: () => set({ isChatOpen: false }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen, isVoiceOpen: false })),
  openVoice: () => set({ isVoiceOpen: true, isChatOpen: false }),
  closeVoice: () => set({ isVoiceOpen: false }),
  toggleVoice: () => set((state) => ({ isVoiceOpen: !state.isVoiceOpen, isChatOpen: false })),
  setActiveProduct: (product) => set({ activeProduct: product }),
}));
