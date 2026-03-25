import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, ShoppingCart, Sparkles } from 'lucide-react';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';

interface Props {
  productId: string;
  categoryId: string;
  currentPrice: number;
}

export default function FrequentlyBoughtTogether({ productId, categoryId, currentPrice }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addItem = useCartStore((s) => s.addItem);
  const openSidebar = useCartStore((s) => s.openSidebar);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    async function load() {
      // Fetch products frequently ordered together (same category, different product)
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .eq('is_available', true)
        .neq('id', productId)
        .gt('stock_quantity', 0)
        .order('is_featured', { ascending: false })
        .limit(3);

      if (data && data.length > 0) {
        setProducts(data as Product[]);
        setSelected(new Set((data as Product[]).map((p) => p.id)));
      }
    }
    load();
  }, [productId, categoryId]);

  if (products.length === 0) return null;

  const selectedProducts = products.filter((p) => selected.has(p.id));
  const bundleTotal = currentPrice + selectedProducts.reduce((sum, p) => sum + p.price, 0);

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddBundle = () => {
    for (const p of selectedProducts) {
      addItem(p);
    }
    openSidebar();
    addToast({ message: `${selectedProducts.length} produit${selectedProducts.length > 1 ? 's' : ''} ajouté${selectedProducts.length > 1 ? 's' : ''} au panier`, type: 'success' });
  };

  return (
    <div className="bg-white/[0.04] border border-white/15 rounded-2xl p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/25 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-cyan-300" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Souvent achetés ensemble</h3>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {products.map((product, idx) => (
          <div key={product.id} className="flex items-center gap-3">
            {idx > 0 && <Plus className="w-4 h-4 text-slate-300 flex-shrink-0" />}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleProduct(product.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selected.has(product.id)
                  ? 'bg-white/[0.05] border-[#2563eb]/35'
                  : 'bg-white/[0.04] border-white/15 opacity-50'
                }`}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                <img
                  src={getProductImageSrc(product.image_url)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={applyProductImageFallback}
                />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-white line-clamp-1">{product.name}</p>
                <p className="text-xs text-cyan-300 font-bold">{product.price.toFixed(2)} €</p>
              </div>
              <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center ${selected.has(product.id)
                  ? 'bg-[#2563eb] border-[#2563eb] text-white'
                  : 'border-white/20'
                }`}>
                {selected.has(product.id) && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </motion.button>
          </div>
        ))}
      </div>

      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/15">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total combiné</p>
            <p className="text-xl font-['Inter',sans-serif] font-bold text-white">
              {bundleTotal.toFixed(2)}<span className="text-sm text-slate-400 ml-1">€</span>
            </p>
          </div>
          <button
            onClick={handleAddBundle}
            className="flex items-center gap-2 bg-gradient-to-r from-[#2563eb] to-[#06b6d4] text-white font-semibold uppercase tracking-wider text-sm px-6 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] active:scale-[0.98] transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Ajouter {selectedProducts.length} article{selectedProducts.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
