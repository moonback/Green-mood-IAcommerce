import { motion } from "motion/react";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../lib/supabase";
import { Product } from "../../lib/types";
import { useTheme } from "../ThemeProvider";

interface ProductRecommendationProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onView: () => void;
}

export default function ProductRecommendation({
  product,
  onAddToCart,
  onView,
}: ProductRecommendationProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const logClick = async () => {
    const { user } = useAuthStore.getState();
    if (user) {
      try {
        await supabase.from("budtender_interactions").insert({
          user_id: user.id,
          interaction_type: "click",
          clicked_product: product.id,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[BudTender] Click log exception:", err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`flex items-center gap-4 p-4 rounded-[1.5rem] transition-all group border ${isLight ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-500/30 shadow-sm' : 'bg-zinc-800/40 hover:bg-zinc-800/60 border-zinc-700/50 hover:border-emerald-500/30'}`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={product.image_url || '/images/presentation.png'}
          className={`w-16 h-16 rounded-2xl object-contain p-2 shadow-md transition-transform group-hover:scale-105 ${isLight ? 'bg-slate-100' : 'bg-zinc-900'}`}
          alt={product.name}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/presentation.png';
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={`/catalogue/${product.slug}`}
          onClick={onView}
          className={`text-sm font-bold line-clamp-1 hover:text-emerald-500 transition-colors ${isLight ? 'text-slate-900' : 'text-white'}`}
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-base font-black text-emerald-400">{product.price}€</p>
          {product.original_value && (
            <p className="text-[10px] text-zinc-500 line-through">
              {product.original_value}€
            </p>
          )}
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          onAddToCart(product);
          logClick();
        }}
        className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-green-400 text-black flex items-center justify-center transition-all shadow-lg hover:shadow-emerald-500/20"
      >
        <ShoppingCart className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}
