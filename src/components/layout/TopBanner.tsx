import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import BannerTicker from "./BannerTicker";

interface TopBannerProps {
  isVisible: boolean;
  onClose: () => void;
  enabled: boolean;
  text: string;
  tickerMessages?: string[];
}

export default function TopBanner({
  isVisible,
  onClose,
  enabled,
  text,
  tickerMessages = [],
}: TopBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && enabled && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-green-neon text-black relative flex items-center overflow-hidden z-[60] border-b border-black/5"
        >
          <div className="w-full">
            <div className="py-2 text-[10px] font-black uppercase tracking-[0.3em]">
              <BannerTicker
                messages={[text, ...tickerMessages].filter(Boolean)}
              />
            </div>
          </div>
          
          <div className="absolute right-0 h-full flex items-center pr-2 bg-gradient-to-l from-green-neon via-green-neon to-transparent pl-8 z-20">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-black/10 rounded-full transition-colors group"
              aria-label="Fermer la bannière"
            >
              <X className="h-4 w-4 transition-transform group-hover:rotate-90 text-black" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

  );
}