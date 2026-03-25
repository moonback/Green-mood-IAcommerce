import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { StoreSettings, useSettingsStore } from '../../store/settingsStore';

type PageTab = 'other'; // No page content tabs left in store settings

interface Props {
    localSettings: StoreSettings;
    setLocalSettings: (s: StoreSettings) => void;
}

export default function AdminContentPagesTab({ localSettings, setLocalSettings }: Props) {
    const [pageTab, setPageTab] = useState<PageTab>('other');
    const { settings } = useSettingsStore();

    const pageTabs: { id: PageTab; label: string; icon: React.ElementType; color: string }[] = [];

    return (
        <div className="space-y-4">
            {/* Page selector tabs */}
            <div className="flex gap-2 flex-wrap">
                {pageTabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setPageTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pageTab === t.id
                            ? 'bg-white/10 border border-white/15 text-white'
                            : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/5'
                        }`}
                    >
                        <t.icon className={`w-3.5 h-3.5 ${pageTab === t.id ? t.color : ''}`} />
                        {t.label}
                    </button>
                ))}
            </div>

            {pageTabs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Gestion statique activée</p>
                        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                            Le contenu des pages "Boutique", "Garanties" et "Produits" est désormais géré directement dans le design premium de l'application pour garantir une performance et une esthétique optimales.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
