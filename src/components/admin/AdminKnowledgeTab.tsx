import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronRight,
  Cpu,
  Edit2,
  FileText,
  FileUp,
  Filter,
  Globe,
  HelpCircle,
  Layers,
  Lightbulb,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateEmbedding } from '../../lib/embeddings';
import { getRelevantKnowledge } from '../../lib/budtenderKnowledge';
import { buildKnowledgeImportRows, extractPdfTextFromFile } from '../../lib/pdfKnowledge';
import { useToastStore } from '../../store/toastStore';
import { parseObsidianNote } from '../../lib/obsidianImport';

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
}

type ModalMode = 'manual' | 'pdf' | 'markdown';

const CATEGORIES = [
  { id: 'science', label: 'Science & Santé', icon: Zap },
  { id: 'policy', label: 'Politiques & Boutique', icon: ShieldCheck },
  { id: 'terpenes', label: 'Terpènes', icon: Globe },
  { id: 'faq', label: 'FAQ Générale', icon: HelpCircle },
  { id: 'manuals', label: 'Notices PDF', icon: FileText },
  { id: 'other', label: 'Autre', icon: Layers },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; accent: string; shadow: string }> = {
  science:  { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   border: 'border-cyan-500/20',   accent: 'bg-cyan-400',   shadow: 'shadow-cyan-500/10' },
  policy:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  accent: 'bg-amber-400',  shadow: 'shadow-amber-500/10' },
  terpenes: { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  accent: 'bg-green-400',  shadow: 'shadow-green-500/10' },
  faq:      { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   accent: 'bg-blue-400',   shadow: 'shadow-blue-500/10' },
  manuals:  { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', accent: 'bg-orange-400', shadow: 'shadow-orange-500/10' },
  other:    { bg: 'bg-zinc-500/10',   text: 'text-zinc-400',   border: 'border-zinc-700',      accent: 'bg-zinc-500',   shadow: 'shadow-zinc-500/10' },
};

const MAX_KNOWLEDGE_CHUNK_CHARS = 1800;
const KNOWLEDGE_CHUNK_OVERLAP = 250;

export default function AdminKnowledgeTab() {
  const { addToast } = useToastStore();
  const [activeSubTab, setActiveSubTab] = useState<'library' | 'simulator'>('library');
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [simQuery, setSimQuery] = useState('');
  const [simResults, setSimResults] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const [isRepairing, setIsRepairing] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('manual');
  const [isSaving, setIsSaving] = useState(false);
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('science');
  const [content, setContent] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfCategory, setPdfCategory] = useState('manuals');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [markdownFiles, setMarkdownFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('knowledge_base')
        .select('id, title, category, content, updated_at')
        .order('category')
        .order('title');

      if (queryError) throw queryError;
      setEntries((data as KnowledgeEntry[]) || []);
    } catch (err) {
      console.error('Erreur lors du chargement de la base de connaissances:', err);
      addToast({ type: 'error', message: 'Impossible de charger la base de connaissances.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const resetForm = () => {
    setEditingEntry(null);
    setTitle('');
    setCategory('science');
    setContent('');
    setPdfTitle('');
    setPdfCategory('manuals');
    setPdfFile(null);
    setError(null);
    setImportProgress(0);
  };

  const handleOpenManualModal = (entry?: KnowledgeEntry) => {
    setModalMode('manual');
    setError(null);

    if (entry) {
      setEditingEntry(entry);
      setTitle(entry.title);
      setCategory(entry.category || 'science');
      setContent(entry.content);
    } else {
      resetForm();
      setCategory('science');
    }

    setIsModalOpen(true);
  };

  const handleOpenPdfModal = () => {
    resetForm();
    setModalMode('pdf');
    setPdfCategory('manuals');
    setIsModalOpen(true);
  };

  const handleOpenMarkdownModal = () => {
    resetForm();
    setModalMode('markdown');
    setMarkdownFiles([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving || isImportingPdf) return;
    setIsModalOpen(false);
    resetForm();
    setModalMode('manual');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Le titre et le contenu sont obligatoires.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const textToEmbed = `${title.trim()}\n\n${content.trim()}`;
      const embedding = await generateEmbedding(textToEmbed);

      if (editingEntry) {
        const { error: updateError } = await supabase
          .from('knowledge_base')
          .update({
            title: title.trim(),
            category,
            content: content.trim(),
            embedding,
          })
          .eq('id', editingEntry.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('knowledge_base')
          .insert({
            title: title.trim(),
            category,
            content: content.trim(),
            embedding,
          });

        if (insertError) throw insertError;
      }

      await loadEntries();
      addToast({ type: 'success', message: editingEntry ? 'Connaissance mise à jour.' : 'Connaissance ajoutée.' });
      handleCloseModal();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.message || "Une erreur est survenue lors de l'enregistrement de l'article ou de son vecteur.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportPdf = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pdfTitle.trim() || !pdfFile) {
      setError('Sélectionnez un PDF et renseignez un titre de notice.');
      return;
    }

    setIsImportingPdf(true);
    setImportProgress(5);
    setError(null);

    try {
      const extractedText = await extractPdfTextFromFile(pdfFile);
      if (!extractedText.trim()) {
        throw new Error("Aucun texte exploitable n'a été extrait du PDF. Vérifiez qu'il s'agit d'un PDF textuel et non d'un scan image.");
      }

      setImportProgress(20);

      const rows = buildKnowledgeImportRows({
        title: pdfTitle.trim(),
        category: pdfCategory,
        text: extractedText,
        maxChars: MAX_KNOWLEDGE_CHUNK_CHARS,
        overlapChars: KNOWLEDGE_CHUNK_OVERLAP,
      });

      if (rows.length === 0) {
        throw new Error('La notice a été lue mais aucun segment n’a pu être préparé pour la vectorisation.');
      }

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const embedding = await generateEmbedding(`${row.title}\n\n${row.content}`);
        const { error: insertError } = await supabase.from('knowledge_base').insert({
          title: row.title,
          category: row.category,
          content: row.content,
          embedding,
        });

        if (insertError) throw insertError;

        const ratio = (index + 1) / rows.length;
        setImportProgress(20 + Math.round(ratio * 80));
      }

      await loadEntries();
      addToast({
        type: 'success',
        message: `Notice importée: ${rows.length} segment(s) vectorisé(s) en 3072 dimensions.`,
      });
      handleCloseModal();
    } catch (err: any) {
      console.error('Erreur lors de l’import PDF:', err);
      setError(err.message || 'Échec de l’import PDF.');
    } finally {
      setIsImportingPdf(false);
    }
  };

  const handleImportMarkdown = async (e: React.FormEvent) => {
    e.preventDefault();

    if (markdownFiles.length === 0) {
      setError('Sélectionnez au moins un fichier Markdown.');
      return;
    }

    setIsImportingPdf(true); // Re-use the same loading state
    setImportProgress(0);
    setError(null);

    try {
      let successCount = 0;
      for (let i = 0; i < markdownFiles.length; i++) {
        const file = markdownFiles[i];
        const content = await file.text();
        const parsed = parseObsidianNote(content, file.name);

        if (!parsed.content.trim()) {
          console.warn(`[Markdown Import] Fichier vide ou illisible : ${file.name}`);
          continue;
        }

        const textToEmbed = `${parsed.title}\n\n${parsed.content}`;
        const embedding = await generateEmbedding(textToEmbed);

        const { error: insertError } = await supabase.from('knowledge_base').insert({
          title: parsed.title,
          category: parsed.category === 'other' ? category : parsed.category, // fallback to selected
          content: parsed.content,
          embedding,
        });

        if (insertError) throw insertError;
        
        successCount++;
        setImportProgress(Math.round(((i + 1) / markdownFiles.length) * 100));
      }

      await loadEntries();
      addToast({
        type: 'success',
        message: `${successCount} note(s) Obsidian importée(s) et vectorisée(s).`,
      });
      handleCloseModal();
    } catch (err: any) {
      console.error('Erreur lors de l’import Markdown:', err);
      setError(err.message || 'Échec de l’import Markdown.');
    } finally {
      setIsImportingPdf(false);
    }
  };

  const handleDelete = async (id: string, entryTitle: string) => {
    if (!confirm(`T'es-tu sûr de vouloir supprimer l'article "${entryTitle}" ? Cette action impactera les connaissances de l'IA.`)) return;

    try {
      const { error: deleteError } = await supabase.from('knowledge_base').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      addToast({ type: 'success', message: 'Connaissance supprimée.' });
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      addToast({ type: 'error', message: 'Impossible de supprimer cette connaissance.' });
    }
  };

  const handleRepairAll = async () => {
    if (!confirm("Voulez-vous regénérer les vecteurs pour TOUS les articles ? Cela permet de s'assurer que l'IA a les connaissances à jour après un changement de modèle.")) return;

    setIsRepairing(true);
    setRepairProgress(0);

    try {
      const { data, error: queryError } = await supabase.from('knowledge_base').select('id, title, content');
      if (queryError) throw queryError;
      if (!data?.length) return;

      let count = 0;
      for (const entry of data) {
        const textToEmbed = `${entry.title}\n\n${entry.content}`;
        const embedding = await generateEmbedding(textToEmbed);
        const { error: updateError } = await supabase.from('knowledge_base').update({ embedding }).eq('id', entry.id);
        if (updateError) throw updateError;

        count += 1;
        setRepairProgress(Math.round((count / data.length) * 100));
      }

      await loadEntries();
      addToast({ type: 'success', message: 'Synchronisation terminée avec succès !' });
    } catch (err) {
      console.error('Repair error:', err);
      addToast({ type: 'error', message: 'Erreur lors de la synchronisation.' });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleSimulate = async () => {
    if (!simQuery.trim()) return;
    setIsSimulating(true);
    try {
      const results = await getRelevantKnowledge(simQuery, 5, 0.0);
      setSimResults(results);
    } catch (err) {
      console.error('Simulation error:', err);
      addToast({ type: 'error', message: 'La simulation de recherche a échoué.' });
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredEntries = useMemo(
    () => entries.filter((entry) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q);
      const matchesCategory = activeCategory ? entry.category === activeCategory : true;
      return matchesSearch && matchesCategory;
    }),
    [entries, searchQuery, activeCategory],
  );

  const categoryCounts = useMemo(
    () => entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {}),
    [entries],
  );

  const totalChars = useMemo(() => entries.reduce((acc, e) => acc + e.content.length, 0), [entries]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-2xl shadow-purple-500/20">
              <BookOpen className="w-7 h-7 text-purple-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-950 border border-purple-500/30 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-serif italic font-bold text-white tracking-tight">BudTender Oracle</h2>
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-black uppercase text-purple-400">
                v2.1 RAG
              </span>
            </div>
            <p className="text-sm text-zinc-500 font-medium max-w-md">
              Gestionnaire de connaissances vectorielles 3072D. Le cerveau du BudTender.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           {/* SUB TAB SELECTOR */}
           <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 p-1 rounded-2xl flex items-center shadow-xl">
            <button
              onClick={() => setActiveSubTab('library')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeSubTab === 'library' ? 'bg-purple-500 text-black shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'text-zinc-500 hover:text-white'}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Bibliothèque
            </button>
            <button
              onClick={() => setActiveSubTab('simulator')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeSubTab === 'simulator' ? 'bg-purple-500 text-black shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'text-zinc-500 hover:text-white'}`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Simulateur
            </button>
          </div>

          <div className="h-10 w-px bg-white/5 mx-2 hidden sm:block" />

          {/* ACTIONS */}
          <button
            onClick={handleRepairAll}
            disabled={isRepairing}
            className={`p-3 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500 hover:text-purple-400 hover:border-purple-500/30 transition-all flex items-center gap-2 ${isRepairing ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            {isRepairing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">{isRepairing ? `${repairProgress}%` : 'Sync'}</span>
          </button>

          <button
            onClick={() => handleOpenManualModal()}
            className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </button>
        </div>
      </div>

      {/* STATS SUMMARY BAR */}
      {!isLoading && entries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-700 delay-100">
           {[
            { label: 'Entrées totales', value: entries.length, icon: Layers, color: 'text-purple-400' },
            { label: 'Volume Savoir', value: `${(totalChars / 1000).toFixed(1)}k`, icon: FileText, color: 'text-cyan-400' },
            { label: 'Dimensions Vector', value: '3072', icon: Cpu, color: 'text-amber-400' },
            { label: 'Santé Index', value: '100%', icon: ShieldCheck, color: 'text-green-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-[1.5rem] p-4 flex items-center gap-4 group hover:bg-zinc-900/60 transition-all">
              <div className={`w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-white/5 group-hover:border-white/10 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</p>
                <p className="text-xl font-serif italic font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'library' ? (
        <div className="space-y-8">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-purple-400 transition-all duration-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Intelligence Artificielle : rechercher dans le cortex..."
                  className="w-full bg-zinc-900/60 border border-white/5 rounded-3xl pl-16 pr-8 py-5 text-sm text-white focus:outline-none focus:border-purple-500/40 focus:ring-4 focus:ring-purple-500/5 transition-all placeholder:text-zinc-700 shadow-inner leading-relaxed"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                <div className="flex items-center gap-1.5 p-1 bg-zinc-950/50 border border-white/5 rounded-2xl h-12">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`h-full px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeCategory === null
                        ? 'bg-zinc-800 text-white shadow-lg'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    Tous Savoirs
                  </button>
                  <div className="w-px h-4 bg-white/5" />
                  {CATEGORIES.map((cat) => {
                    const colors = CATEGORY_COLORS[cat.id] ?? CATEGORY_COLORS.other;
                    const isActive = activeCategory === cat.id;
                    const count = categoryCounts[cat.id] ?? 0;
                    if (count === 0 && !isActive) return null;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(isActive ? null : cat.id)}
                        className={`h-full px-4 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          isActive
                            ? `${colors.bg} ${colors.text} ${colors.border} shadow-lg`
                            : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                      >
                        <cat.icon className="w-3.5 h-3.5" />
                        {cat.label}
                        <span className="opacity-40 font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* QUICK IMPORT CARDS */}
            <div className="flex gap-4">
               <button
                  onClick={handleOpenPdfModal}
                  className="xl:w-48 p-4 bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/5 hover:border-purple-500/30 rounded-[1.5rem] transition-all group flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300">Importer PDF</span>
                </button>
                <button
                  onClick={handleOpenMarkdownModal}
                  className="xl:w-48 p-4 bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/5 hover:border-purple-500/30 rounded-[1.5rem] transition-all group flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300">Obsidian Vault</span>
                </button>
            </div>
          </div>

          {/* GRID ENTRIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                Array.from({ length: 9 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="bg-zinc-900/40 border border-white/5 rounded-[2rem] h-64 animate-pulse" />
                ))
              ) : filteredEntries.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-32 text-center"
                >
                  <div className="w-20 h-20 bg-zinc-950 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-zinc-800" />
                  </div>
                  <h3 className="text-xl font-serif italic text-zinc-600">Aucun fragment de savoir trouvé.</h3>
                  <p className="text-sm text-zinc-700 mt-2">Affinez vos filtres ou créez une nouvelle entrée.</p>
                </motion.div>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const colors = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.other;
                  const cat = CATEGORIES.find(c => c.id === entry.category);
                  const Icon = cat?.icon || Layers;
                  
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      key={entry.id}
                      className={`group bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-[2.25rem] hover:bg-zinc-900/80 hover:border-white/20 transition-all flex flex-col overflow-hidden shadow-2xl ${colors.shadow}`}
                    >
                      <div className="p-7 flex flex-col flex-1">
                        <div className="flex items-start justify-between mb-6">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${colors.bg} ${colors.text} ${colors.border}`}>
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{cat?.label || entry.category}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button
                              onClick={() => handleOpenManualModal(entry)}
                              className="p-2.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                              title="Éditer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id, entry.title)}
                              className="p-2.5 text-zinc-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl transition-all"
                              title="Supprime"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 flex-1">
                          <h3 className="text-xl font-serif italic font-bold text-white group-hover:text-purple-300 transition-colors leading-tight">
                            {entry.title}
                          </h3>
                          <p className="text-sm text-zinc-500 leading-relaxed line-clamp-4 font-medium italic">
                            “{entry.content}”
                          </p>
                        </div>

                        <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Dernière mise à jour</span>
                            <span className="text-[10px] font-mono text-zinc-500">{new Date(entry.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Indexation</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Vector 3072D</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Taille</span>
                                <span className="text-[10px] font-mono text-zinc-400">{entry.content.length} c.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* SIMULATOR TAB */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
              {/* LEFT: SIMULATOR INPUT */}
              <div className="space-y-8">
                <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
                  {/* Decorative background blur */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] -z-10 group-hover:bg-purple-500/10 transition-all duration-1000" />
                  
                  <div className="max-w-2xl space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                          <Lightbulb className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h3 className="text-2xl font-serif italic font-bold text-white">Simulation Cognitive</h3>
                      </div>
                      <p className="text-lg text-zinc-400 leading-relaxed italic">
                        “Testez en temps réel l'association d'idées de l'IA. Posez une question complexe pour voir quels fragments sont activés.”
                      </p>
                    </div>

                    <div className="relative">
                       <input
                        type="text"
                        value={simQuery}
                        onChange={(e) => setSimQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                        placeholder="Ex: comment se passe le remboursement si mon colis est perdu ?"
                        className="w-full bg-black/60 border border-white/5 rounded-3xl pl-8 pr-16 py-6 text-base text-white focus:outline-none focus:border-purple-500/40 focus:ring-4 focus:ring-purple-500/5 transition-all shadow-inner placeholder:italic placeholder:text-zinc-700"
                      />
                      <button
                        onClick={handleSimulate}
                        disabled={isSimulating || !simQuery.trim()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 disabled:grayscale text-black rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
                      >
                        {isSimulating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-6 h-6" />}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                       {['Politique retour', 'Terpènes CBD', 'Effet d\'entourage', 'Délai livraison'].map((tag, i) => (
                         <button 
                          key={i} 
                          onClick={() => setSimQuery(tag)}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                         >
                           {tag}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-6">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-600">
                      Réseau de Neurones : Activation {simResults.length > 0 ? `(${simResults.length})` : ''}
                    </h4>
                    {simResults.length > 0 && (
                      <button 
                        onClick={() => setSimResults([])}
                        className="text-[10px] font-black uppercase text-zinc-700 hover:text-white transition-colors"
                      >
                        Effacer
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence>
                      {simResults.length === 0 && !isSimulating && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-zinc-950/20"
                        >
                          <Zap className="w-10 h-10 text-zinc-800 mx-auto mb-6" />
                          <p className="text-zinc-600 font-serif italic text-lg opacity-40">Attente de stimulation...</p>
                        </motion.div>
                      )}

                      {simResults.map((result, index) => {
                        const colors = CATEGORY_COLORS[result.category] ?? CATEGORY_COLORS.other;
                        const score = Math.round(result.similarity * 100);
                        const cat = CATEGORIES.find(c => c.id === result.category);
                        const Icon = cat?.icon || Layers;

                        return (
                          <motion.div
                            initial={{ opacity: 0, x: -20, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            key={result.id}
                            className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-[2.5rem] overflow-hidden relative group hover:bg-zinc-900/40 transition-all shadow-xl"
                          >
                            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${colors.accent}`} />
                            <div className="p-8 flex items-center gap-8">
                               <div className="flex flex-col items-center gap-2 min-w-[70px]">
                                  <div className={`text-3xl font-black italic ${colors.text}`}>{score}%</div>
                                  <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Match</div>
                                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${score}%` }}
                                      transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                                      className={`h-full ${colors.accent}`} 
                                    />
                                  </div>
                               </div>

                               <div className="flex-1 min-w-0 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${colors.bg} ${colors.text} ${colors.border}`}>
                                      {cat?.label || result.category}
                                    </div>
                                    <h5 className="text-xl font-serif italic font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                                      {result.title}
                                    </h5>
                                  </div>
                                  <p className="text-sm text-zinc-500 leading-relaxed italic line-clamp-2">
                                    “{result.content}”
                                  </p>
                               </div>

                               <button
                                onClick={() => handleOpenManualModal(entries.find(e => e.id === result.id))}
                                className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shrink-0 hover:scale-110 active:scale-95 shadow-xl"
                               >
                                 <Edit2 className="w-5 h-5" />
                               </button>

                               {index === 0 && (
                                <div className="absolute top-0 right-8">
                                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-black text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-b-2xl shadow-2xl flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    Cognitive Winner
                                  </div>
                                </div>
                               )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* RIGHT: SIMULATOR TIPS */}
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-8 space-y-6">
                   <h5 className="text-[11px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                     <FileText className="w-4 h-4 text-purple-400" />
                     Analyse Technique
                   </h5>
                   <div className="space-y-4">
                      {[
                        { label: 'Embedding', val: 'Cosine Similarity', desc: 'Calcul de l\'angle spatial entre les vecteurs.' },
                        { label: 'Dimension', val: '3072 Float', desc: 'Précision maximale du modèle text-embedding-3-small.' },
                        { label: 'Seuil RAG', val: '> 0.35 act.', desc: 'Déclanchée uniquement au-dessus d\'un score de pertinence.' }
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5 space-y-1">
                          <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                            <span className="text-zinc-500">{item.label}</span>
                            <span className="text-purple-400">{item.val}</span>
                          </div>
                          <p className="text-[10px] text-zinc-600 italic">{item.desc}</p>
                        </div>
                      ))}
                   </div>

                   <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-2xl space-y-3">
                      <p className="text-xs text-purple-300 leading-relaxed font-medium">
                        <strong>Astuce Simulation :</strong> Les questions de vos clients ne sont jamais exactes. Testez le moteur avec des synonymes ou des tournures floues.
                      </p>
                      <ul className="text-[10px] text-zinc-500 space-y-2 list-disc pl-4">
                        <li>Fautes d'orthographe locales</li>
                        <li>Langage familier</li>
                        <li>Demandes multi-intention</li>
                      </ul>
                   </div>
                </div>

                <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2rem] text-center">
                   <Globe className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
                   <p className="text-xs text-zinc-600 font-medium italic">
                     Propulsé par Google Gemini & Supabase Vector extension.
                   </p>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL SYSTEM */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
              layoutId={modalMode === 'manual' && editingEntry ? `card-${editingEntry.id}` : `${modalMode}-card`}
              className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between p-8 border-b border-white/5 bg-zinc-950/20 backdrop-blur-md">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    {modalMode === 'pdf' ? <FileUp className="w-6 h-6 text-purple-400" /> : <Edit2 className="w-6 h-6 text-purple-400" />}
                   </div>
                   <div>
                    <h3 className="text-2xl font-serif italic font-bold text-white">
                      {modalMode === 'pdf'
                        ? 'Import Intelligent PDF'
                        : modalMode === 'markdown'
                          ? 'Obsidian Knowledge Vault'
                          : editingEntry
                            ? 'Raffinage du Savoir'
                            : 'Nouveau Fragment de Savoir'}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5 uppercase tracking-widest">
                       {modalMode === 'pdf' ? 'Conversion locale en vecteurs spatiaux' : 'Saisie sémantique structurée'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MODAL CONTENT */}
              <div className="p-8 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400 font-medium leading-relaxed">{error}</p>
                  </motion.div>
                )}

                {modalMode === 'pdf' ? (
                  <form id="knowledge-pdf-form" onSubmit={handleImportPdf} className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
                       <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Titre de la notice</label>
                            <input
                              type="text"
                              value={pdfTitle}
                              onChange={(e) => setPdfTitle(e.target.value)}
                              placeholder="Fiche technique : Gelato 41 (Indoor)"
                              required
                              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all placeholder:italic"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Fichier source</label>
                            <label className="block cursor-pointer rounded-3xl border-2 border-dashed border-white/5 hover:border-purple-500/20 bg-black/20 hover:bg-black/40 transition-all p-10 group">
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  setPdfFile(file);
                                  if (file && !pdfTitle.trim()) {
                                    setPdfTitle(file.name.replace(/\.pdf$/i, ''));
                                  }
                                }}
                              />
                              <div className="flex flex-col items-center justify-center text-center gap-4">
                                <div className="w-16 h-16 rounded-[2rem] bg-zinc-950 border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500/10 group-hover:border-purple-500/20 transition-all duration-500">
                                  <FileText className="w-7 h-7 text-zinc-600 group-hover:text-purple-400" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-base font-bold text-white transition-colors">{pdfFile ? pdfFile.name : 'Déposez votre PDF ici'}</p>
                                  <p className="text-xs text-zinc-600 font-medium italic">Supports PDF textuels natifs uniquement.</p>
                                </div>
                              </div>
                            </label>
                          </div>
                       </div>

                       <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Destination</label>
                              <select
                                value={pdfCategory}
                                onChange={(e) => setPdfCategory(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all appearance-none cursor-pointer"
                              >
                                {CATEGORIES.map((item) => (
                                  <option key={item.id} value={item.id} className="bg-zinc-900">{item.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="bg-zinc-950/60 border border-white/5 rounded-3xl p-6 space-y-4">
                               <h6 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Auto-Chunking Setup</h6>
                               <div className="space-y-3">
                                  <div className="flex justify-between items-center text-xs">
                                     <span className="text-zinc-600 font-medium">Taille segment</span>
                                     <span className="text-white font-mono">{MAX_KNOWLEDGE_CHUNK_CHARS} c.</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                     <span className="text-zinc-600 font-medium">Overlap</span>
                                     <span className="text-white font-mono">{KNOWLEDGE_CHUNK_OVERLAP} c.</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                     <span className="text-zinc-600 font-medium">Dimensions</span>
                                     <span className="text-purple-400 font-mono">3072D</span>
                                  </div>
                               </div>
                               <div className="pt-2">
                                  <div className="text-[9px] text-zinc-600 italic bg-white/5 p-3 rounded-xl border border-white/5">
                                    Une notice trop longue est divisée pour garantir la précision sémantique de l'IA.
                                  </div>
                               </div>
                            </div>
                       </div>
                    </div>

                    {isImportingPdf && (
                      <div className="space-y-3 p-6 bg-zinc-950/40 rounded-3xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest text-white">Pipeline de vectorisation...</span>
                          </div>
                          <span className="text-sm font-black italic font-serif text-purple-400">{importProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${importProgress}%` }}
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                          />
                        </div>
                      </div>
                    )}
                  </form>
                ) : modalMode === 'markdown' ? (
                  <form id="knowledge-markdown-form" onSubmit={handleImportMarkdown} className="space-y-8 animate-in fade-in duration-500">
                    <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-8 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-xl">
                          <Globe className="w-7 h-7 text-purple-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-serif italic font-bold text-white">Vault Obsidian Connector</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Nettoyage syntaxique intelligent intégré</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <label className="block cursor-pointer rounded-[2rem] border-2 border-dashed border-white/5 hover:border-purple-500/20 bg-black/20 hover:bg-black/40 transition-all p-12 text-center group">
                          <input
                            type="file"
                            accept=".md"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setMarkdownFiles(files);
                            }}
                          />
                          <div className="w-20 h-20 bg-zinc-950 border border-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-purple-500/10 transition-all duration-500">
                            <FileUp className="w-8 h-8 text-zinc-700 group-hover:text-purple-400" />
                          </div>
                          <p className="text-lg font-bold text-zinc-300 group-hover:text-white transition-colors">
                            {markdownFiles.length > 0 
                              ? `${markdownFiles.length} note(s) sélectionnée(s)` 
                              : 'Sélectionnez des notes Markdown'}
                          </p>
                          <p className="text-xs text-zinc-600 mt-2 font-medium">Glissez-déposez plusieurs fichiers .md pour une importation groupée.</p>
                        </label>

                        {markdownFiles.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 rounded-3xl p-6 border border-white/5 max-h-48 overflow-y-auto">
                            {markdownFiles.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
                                <span className="text-[9px] font-bold text-zinc-400 truncate uppercase tracking-tight">{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Catégorie fallback</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all appearance-none cursor-pointer"
                        >
                          {CATEGORIES.map((item) => (
                            <option key={item.id} value={item.id} className="bg-zinc-900">{item.label}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-zinc-600 italic px-2">Utilisée si le Frontmatter YAML est absent de la note.</p>
                      </div>
                      <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 flex flex-col justify-center">
                         <div className="flex items-center gap-3 mb-2">
                           <Zap className="w-5 h-5 text-purple-400" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Nettoyage Cortex</span>
                         </div>
                         <p className="text-[11px] text-zinc-500 leading-relaxed font-medium italic">
                            “Tous les [[WikiLinks]], Callouts CSS et Tags seront convertis en texte brut propre pour l'IA.”
                         </p>
                      </div>
                    </div>

                    {isImportingPdf && (
                      <div className="space-y-4 p-8 bg-zinc-950/40 rounded-3xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-white">Importation du Vault...</span>
                          <span className="text-sm font-black italic font-serif text-purple-400">{importProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${importProgress}%` }}
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                          />
                        </div>
                      </div>
                    )}
                  </form>
                ) : (
                  /* MANUAL ENTRY FORM */
                  <form id="knowledge-form" onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Titre du Savoir</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Fiche Expert : Terpène Myrcène"
                          required
                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-base text-white focus:outline-none focus:border-purple-500/40 transition-all font-serif italic font-bold placeholder:font-sans placeholder:italic placeholder:font-medium shadow-inner"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Classification</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-[62px] bg-black/40 border border-white/5 rounded-2xl px-6 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all appearance-none cursor-pointer"
                        >
                          {CATEGORIES.map((item) => (
                            <option key={item.id} value={item.id} className="bg-zinc-900">{item.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Substance de l'information</label>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] text-zinc-600 font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{content.length} / 1800 car.</span>
                        </div>
                      </div>
                      <div className="relative group">
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Décrivez ici le savoir brut que l'IA doit posséder..."
                          required
                          rows={12}
                          className="w-full bg-black/40 border border-white/5 rounded-3xl px-8 py-6 text-base text-white focus:outline-none focus:border-purple-500/30 transition-all resize-none leading-relaxed font-medium italic shadow-inner"
                        />
                        <div className="absolute bottom-6 right-6 p-2 bg-zinc-900/80 backdrop-blur rounded-xl border border-white/5 opacity-40">
                           <Edit2 className="w-4 h-4 text-zinc-500" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/40 border border-white/5 rounded-[2rem] p-6 flex flex-col lg:flex-row items-center gap-6">
                       <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                          <Cpu className="w-8 h-8 text-purple-400" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-sm text-purple-200 leading-relaxed font-bold italic">
                            “Mécanisme Vectoriel 3072D”
                          </p>
                          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                            Dès la sauvegarde, ce texte sera transformé en coordonnées spatiales permettant une recherche par proximité sémantique (RAG).
                          </p>
                       </div>
                    </div>
                  </form>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-between gap-4 p-8 border-t border-white/5 bg-zinc-950/40 backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving || isImportingPdf}
                  className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  Abandonner
                </button>
                <button
                  form={modalMode === 'pdf' ? 'knowledge-pdf-form' : modalMode === 'markdown' ? 'knowledge-markdown-form' : 'knowledge-form'}
                  type="submit"
                  disabled={isSaving || isImportingPdf}
                  className="flex items-center gap-3 bg-white hover:bg-zinc-200 text-black px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.03] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving || isImportingPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {importProgress > 0 ? `${importProgress}%` : 'Traitement...'}
                    </>
                  ) : (
                    <>
                      {modalMode === 'pdf' || modalMode === 'markdown' ? <FileUp className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {modalMode === 'pdf' 
                        ? 'Importer & Vectoriser' 
                        : modalMode === 'markdown' 
                          ? 'Synchroniser le Vault' 
                          : editingEntry 
                            ? 'Mettre à jour' 
                            : 'Injecter le Savoir'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
