import { memo, useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchBarProps {
    categories?: { slug: string; name: string }[];
    placeholder?: string;
    onSearch?: (query: string, category: string) => void;
    className?: string;
}

const ALL_CATEGORY = { slug: '', name: 'Tout le catalogue' };

export const SearchBar = memo(function SearchBar({
    categories = [],
    placeholder = 'Rechercher des produits…',
    onSearch,
    className = '',
}: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [catOpen, setCatOpen] = useState(false);
    const [selected, setSelected] = useState(ALL_CATEGORY);
    const [focused, setFocused] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const allCategories = [ALL_CATEGORY, ...categories];

    const handleSubmit = useCallback(
        (e?: FormEvent) => {
            e?.preventDefault();
            const trimmed = query.trim();
            if (!trimmed) return;
            onSearch?.(trimmed, selected.slug);
            const params = new URLSearchParams({ search: trimmed });
            if (selected.slug) params.set('category', selected.slug);
            navigate(`/catalogue?${params.toString()}`);
        },
        [query, selected, onSearch, navigate],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') {
                setQuery('');
                inputRef.current?.blur();
            }
        },
        [handleSubmit],
    );

    const clearQuery = useCallback(() => {
        setQuery('');
        inputRef.current?.focus();
    }, []);

    return (
        <form
            role="search"
            aria-label="Rechercher des produits"
            onSubmit={handleSubmit}
            className={`flex w-full max-w-3xl mx-auto ${className}`}
        >
            {categories.length > 0 && (
                <div className="relative shrink-0">
                    <button
                        type="button"
                        onClick={() => setCatOpen((v) => !v)}
                        className="
              h-full px-3 py-2.5 bg-slate-900/70 border-y border-l border-white/15
              rounded-l-2xl text-slate-300 text-xs font-semibold
              flex items-center gap-1.5 whitespace-nowrap
              hover:bg-slate-900 transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]
            "
                        aria-haspopup="listbox"
                        aria-expanded={catOpen}
                        aria-label={`Catégorie sélectionnée: ${selected.name}`}
                    >
                        <span className="hidden sm:inline max-w-[120px] truncate">{selected.name}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    <AnimatePresence>
                        {catOpen && (
                            <motion.ul
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                role="listbox"
                                aria-label="Catégories"
                                className="
                  absolute top-full left-0 mt-1 z-50
                  min-w-[180px] bg-slate-900/90 border border-white/15
                  rounded-2xl shadow-2xl overflow-hidden py-1
                "
                                onMouseLeave={() => setCatOpen(false)}
                            >
                                {allCategories.map((cat) => (
                                    <li key={cat.slug}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={selected.slug === cat.slug}
                                            onClick={() => {
                                                setSelected(cat);
                                                setCatOpen(false);
                                                inputRef.current?.focus();
                                            }}
                                            className={`
                        w-full text-left px-4 py-2.5 text-sm transition-colors duration-100
                        ${selected.slug === cat.slug
                                                    ? 'bg-green-neon/10 text-green-neon font-semibold'
                                                    : 'text-slate-300 hover:bg-slate-900/70 hover:text-slate-100'
                                                }
                      `}
                                        >
                                            {cat.name}
                                        </button>
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <div className="relative flex-1 min-w-0">
                <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    aria-label="Terme de recherche"
                    autoComplete="off"
                    spellCheck={false}
                    className={`
            w-full h-full pl-4 pr-10 py-2.5
            bg-slate-900/60 border-y border-white/15
            ${categories.length === 0 ? 'rounded-l-2xl border-l' : ''}
            text-sm text-slate-100 placeholder-slate-400
            focus:outline-none focus:bg-slate-900/90
            transition-colors duration-150
          `}
                />

                <AnimatePresence>
                    {query.length > 0 && (
                        <motion.button
                            type="button"
                            onClick={clearQuery}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            aria-label="Effacer la recherche"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <button
                type="submit"
                aria-label="Lancer la recherche"
                className={`
          shrink-0 px-4 md:px-6
          bg-green-neon text-white
          rounded-r-2xl border border-green-neon/50
          font-bold text-sm
          hover:bg-green-neon/80 hover:shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.3)] 
          active:scale-95
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-green-neon
          flex items-center gap-2
        `}
            >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-black uppercase tracking-widest">Chercher</span>
            </button>
        </form>
    );
});
