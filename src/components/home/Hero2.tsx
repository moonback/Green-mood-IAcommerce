import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Product as DbProduct } from '../../lib/types';

type Product = {
  id: string;
  slug: string;
  title: string;
  price: string;
  image: string;
  discount?: string;
};

const getItemsToShow = () => {
  if (typeof window === 'undefined') return 4;
  if (window.innerWidth < 768) return 1;
  if (window.innerWidth < 1024) return 2;
  return 4;
};

function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/catalogue/${product.slug}`} className="block h-full group">
      <article className="relative h-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 p-3 backdrop-blur-md transition-all hover:border-[color:var(--color-primary)]/50 hover:bg-[color:var(--color-card)]/60 hover:shadow-[0_0_30px_-10px_rgba(var(--color-primary-rgb),0.3)]">
        {product.discount && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-black text-white shadow-lg uppercase tracking-tight">
            {product.discount}
          </span>
        )}
        <div className="overflow-hidden rounded-xl bg-[color:var(--color-bg-elevated)] relative">
          <img
            src={product.image || '/images/hero_premium_gadget.png'}
            alt={product.title}
            loading="lazy"
            className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-card)]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-xs font-black uppercase tracking-tight text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)] transition-colors">{product.title}</h3>
          <p className="text-lg font-black text-[color:var(--color-primary)] tabular-nums">{product.price}</p>
        </div>
      </article>
    </Link>
  );
}

export default function Hero() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemsToShow, setItemsToShow] = useState(getItemsToShow);
  const [currentIndex, setCurrentIndex] = useState(itemsToShow);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const startX = useRef(0);
  const deltaX = useRef(0);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .limit(8);

        if (error) throw error;

        if (data) {
          const mappedProducts: Product[] = data.map((p: DbProduct) => {
            let discount;
            if (p.original_value && p.original_value > p.price) {
              const diff = Math.round((1 - p.price / p.original_value) * 100);
              discount = `-${diff}%`;
            }
            return {
              id: p.id,
              slug: p.slug,
              title: p.name,
              price: `€${p.price.toFixed(2)}`,
              image: p.image_url || '/images/hero_premium_gadget.png',
              discount
            };
          });
          setProducts(mappedProducts);
          setCurrentIndex(itemsToShow);
        }
      } catch (err) {
        console.error('Error fetching hero products:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [itemsToShow]);

  const extendedProducts = useMemo(() => {
    if (products.length === 0) return [];
    const head = products.slice(-itemsToShow);
    const tail = products.slice(0, itemsToShow);
    return [...head, ...products, ...tail];
  }, [products, itemsToShow]);

  useEffect(() => {
    const update = () => setItemsToShow(getItemsToShow());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!products.length) return;
    setTransitionEnabled(false);
    setCurrentIndex(itemsToShow);
    const id = window.setTimeout(() => setTransitionEnabled(true), 40);
    return () => window.clearTimeout(id);
  }, [itemsToShow, products.length]);

  useEffect(() => {
    if (isHovered || isDragging || products.length === 0) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [isHovered, isDragging, products.length]);

  useEffect(() => {
    if (products.length === 0 || currentIndex !== products.length + itemsToShow) return;
    const id = window.setTimeout(() => {
      setTransitionEnabled(false);
      setCurrentIndex(itemsToShow);
      requestAnimationFrame(() => setTransitionEnabled(true));
    }, 500);
    return () => window.clearTimeout(id);
  }, [currentIndex, itemsToShow, products.length]);

  useEffect(() => {
    if (products.length === 0 || currentIndex !== 0) return;
    const id = window.setTimeout(() => {
      setTransitionEnabled(false);
      setCurrentIndex(products.length);
      requestAnimationFrame(() => setTransitionEnabled(true));
    }, 500);
    return () => window.clearTimeout(id);
  }, [currentIndex, products.length]);

  const next = () => {
    if (products.length === 0) return;
    setCurrentIndex((prev) => prev + 1);
  };
  const prev = () => {
    if (products.length === 0) return;
    setCurrentIndex((prev) => prev - 1);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (products.length === 0) return;
    setIsDragging(true);
    startX.current = event.clientX;
    deltaX.current = 0;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    deltaX.current = event.clientX - startX.current;
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    const threshold = 45;
    if (deltaX.current < -threshold) next();
    if (deltaX.current > threshold) prev();
    setIsDragging(false);
    deltaX.current = 0;
  };

  const realIndex = products.length > 0 ? (currentIndex - itemsToShow + products.length) % products.length : 0;

  if (isLoading) {
    return (
      <section className="relative overflow-hidden bg-[color:var(--color-bg)] px-4 py-32 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[color:var(--color-primary)] animate-spin" />
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[color:var(--color-bg)] px-4 py-16 md:px-8 lg:px-16 transition-colors duration-300">
      <div className="mx-auto max-w-8xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Deals du moment
            </div>
            <h1 className="text-3xl font-black text-[color:var(--color-text)] md:text-5xl uppercase tracking-tighter leading-[0.9]">
              Trouvez vos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] via-indigo-400 to-[color:var(--color-primary)]">best-sellers</span>
            </h1>
          </div>
          <Link
            to="/catalogue"
            className="hidden rounded-xl bg-[color:var(--color-text)] px-6 py-3.5 text-sm font-bold text-[color:var(--color-bg)] transition-all hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-primary-contrast)] hover:scale-105 md:inline-flex"
          >
            Voir tout
          </Link>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className="overflow-hidden"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              className="flex touch-pan-y"
              style={{
                transform: `translateX(-${(100 / itemsToShow) * currentIndex}%)`,
                transition: transitionEnabled ? 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
              }}
            >
              {extendedProducts.map((product, index) => (
                <div
                  key={`${product.id}-${index}`}
                  className="shrink-0 p-2 md:p-3"
                  style={{ width: `${100 / itemsToShow}%` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={prev}
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)]/50 backdrop-blur-md p-2.5 text-[color:var(--color-text)] transition-all hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-primary-contrast)] hover:scale-110 active:scale-95"
            aria-label="Slide précédent"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={next}
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)]/50 backdrop-blur-md p-2.5 text-[color:var(--color-text)] transition-all hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-primary-contrast)] hover:scale-110 active:scale-95"
            aria-label="Slide suivant"
          >
            <ChevronRight size={22} />
          </button>

          <div className="mt-8 flex justify-center gap-3">
            {products.map((_, idx) => {
              const active = idx === realIndex;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setTransitionEnabled(true);
                    setCurrentIndex(idx + itemsToShow);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${active ? 'w-8 bg-[color:var(--color-primary)]' : 'w-2 bg-[color:var(--color-border)] hover:bg-[color:var(--color-text-muted)]'}`}
                  aria-label={`Aller au slide ${idx + 1}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
