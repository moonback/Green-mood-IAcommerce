import { motion } from 'motion/react';
import {
  Bot,
  Mic,
  Search,
  FileText,
  Cpu,
  Sparkles,
  Globe,
  ShieldCheck,
  Zap,
  Layers
} from 'lucide-react';

interface AIModelMapping {
  feature: string;
  provider: string;
  model: string;
  role: string;
  icon: any;
  status: 'active' | 'beta' | 'training';
  latency: 'low' | 'medium' | 'high';
}

const aiModels: AIModelMapping[] = [
  {
    feature: 'Assistant BudTender',
    provider: 'Google AI Native',
    model: 'gemini-2.5-flash-native-audio-preview',
    role: 'Conversation vocale fluide en temps réel avec latence ultra-faible.',
    icon: Mic,
    status: 'active',
    latency: 'low',
  },
  {
    feature: 'Recherche Sémantique (Vector Search)',
    provider: 'OpenRouter / OpenAI',
    model: 'text-embedding-3-large (3072 dim)',
    role: 'Conversion des produits et questions en vecteurs numériques pour le matching.',
    icon: Search,
    status: 'active',
    latency: 'low',
  },
  {
    feature: 'Enrichissement Produits (IA)',
    provider: 'OpenRouter / Mistral',
    model: 'mistralai/mistral-small-creative',
    role: 'Génération automatique de descriptions et caractéristiques techniques.',
    icon: Sparkles,
    status: 'active',
    latency: 'medium',
  },
  {
    feature: 'Génération SEO & Blog',
    provider: 'OpenRouter / Mistral',
    model: 'mistralai/mistral-small-creative',
    role: 'Création d\'articles de blog et balises meta SEO basés sur le RAG.',
    icon: FileText,
    status: 'active',
    latency: 'medium',
  },
  {
    feature: 'Commandes Vocales Admin',
    provider: 'Google AI Native',
    model: 'gemini-2.5-flash-native-audio-preview',
    role: 'Interprétation des commandes vocales pour la gestion du back-office.',
    icon: Zap,
    status: 'active',
    latency: 'low',
  },
  {
    feature: 'Classification & Tags IA',
    provider: 'Interne / Heuristique',
    model: 'Semantic Mapping',
    role: 'Organisation automatique des catégories et attributs intelligents.',
    icon: Layers,
    status: 'active',
    latency: 'low',
  }
];

export default function AdminAIModelsTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" />
            Transparence des Modèles IA
          </h2>
          <p className="text-zinc-400 mt-1">
            Visualisez quel service et quel modèle propulse chaque fonctionnalité de votre boutique.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Système Sécurisé</span>
          </div>
        </div>
      </div>

      {/* Grid of Models */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {aiModels.map((item, idx) => (
          <motion.div
            key={item.feature}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-5 hover:bg-zinc-800/50 hover:border-emerald-500/20 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl bg-zinc-800 border border-white/[0.08] group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-colors`}>
                <item.icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                    {item.feature}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.latency === 'low' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                      {item.latency === 'low' ? 'Temps Réel' : 'Asynchrone'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.role}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[11px] text-zinc-300 font-medium">{item.provider}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                      <code className="text-[11px] text-emerald-400/90 font-mono bg-emerald-500/5 px-1.5 py-0.5 rounded">
                        {item.model}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status light */}
            <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </motion.div>
        ))}
      </div>

      {/* Infrastructure Footer */}
      <div className="bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent border border-white/[0.06] rounded-2xl p-6 mt-4">
        <h3 className="text-sm font-semibold text-white mb-3">Infrastructure AI-First</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Passerelle API</p>
            <p className="text-sm text-zinc-300">OpenRouter (Abstraction Multimodèle)</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Base de Données</p>
            <p className="text-sm text-zinc-300">Supabase + Extension pgvector (HNSW)</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Traitement local</p>
            <p className="text-sm text-zinc-300">Supabase Cloud Functions (Edge Runners)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
