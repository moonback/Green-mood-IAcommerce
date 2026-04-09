import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Edit2,
  FileUp,
  Lightbulb,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
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
  { id: 'science', label: 'Science & Santé' },
  { id: 'policy', label: 'Politiques & Boutique' },
  { id: 'terpenes', label: 'Terpènes' },
  { id: 'faq', label: 'FAQ Générale' },
  { id: 'manuals', label: 'Notices PDF' },
  { id: 'other', label: 'Autre' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  science:  { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   border: 'border-cyan-500/20',   accent: 'bg-cyan-400' },
  policy:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  accent: 'bg-amber-400' },
  terpenes: { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  accent: 'bg-green-400' },
  faq:      { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   accent: 'bg-blue-400' },
  manuals:  { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', accent: 'bg-orange-400' },
  other:    { bg: 'bg-zinc-500/10',   text: 'text-zinc-400',   border: 'border-zinc-700',      accent: 'bg-zinc-500' },
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
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchQuery.toLowerCase());
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

  const selectedCategoryLabel = CATEGORIES.find((item) => item.id === pdfCategory)?.label || pdfCategory;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif italic font-bold">Base de Connaissances IA</h2>
              {!isLoading && (
                <span className="text-[10px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  {entries.length}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">Gérez les principes, faits, politiques et notices techniques connus par le BudTender.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'library' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Bibliothèque
          </button>
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'simulator' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500'}`}
          >
            <Play className="w-3.5 h-3.5" />
            Simulateur
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRepairAll}
            disabled={isRepairing}
            title="Regénérer tous les vecteurs"
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-purple-400 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isRepairing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-[10px] font-bold">{repairProgress}%</span>
              </>
            ) : (
              <Settings className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleOpenMarkdownModal}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-zinc-800"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            Importer Obsidian
          </button>

          <button
            onClick={handleOpenPdfModal}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-zinc-800"
          >
            <FileUp className="w-4 h-4 text-purple-400" />
            Importer PDF
          </button>

          <button
            onClick={() => handleOpenManualModal()}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Nouveau Savoir
          </button>
        </div>
      </div>

      {activeSubTab === 'library' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans les connaissances..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeCategory === null
                      ? 'bg-zinc-700 border-zinc-600 text-white'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Tout
                  <span className="font-mono opacity-70">{entries.length}</span>
                </button>
                {CATEGORIES.filter((cat) => (categoryCounts[cat.id] ?? 0) > 0).map((cat) => {
                  const colors = CATEGORY_COLORS[cat.id] ?? CATEGORY_COLORS.other;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(isActive ? null : cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        isActive
                          ? `${colors.bg} ${colors.text} ${colors.border}`
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.accent}`} />
                      {cat.label}
                      <span className="font-mono opacity-70">{categoryCounts[cat.id] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[1.75rem] p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <FileUp className="w-4 h-4 text-purple-300" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Import PDF notices</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Chargez une notice PDF complète: le texte est extrait, découpé en segments optimisés pour le RAG puis vectorisé en 3072 dimensions.
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 space-y-1.5">
                <p>• idéal pour notices constructeur, guides SAV et fiches techniques longues</p>
                <p>• segmentation automatique pour éviter un seul vecteur trop volumineux</p>
                <p>• limitation actuelle: PDF textuels, pas les scans image sans OCR</p>
              </div>
              <button
                onClick={handleOpenPdfModal}
                className="w-full flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                <FileUp className="w-4 h-4" />
                Ouvrir l’import
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] h-56 animate-pulse" />
              ))
            ) : filteredEntries.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                  <BookOpen className="w-6 h-6 text-zinc-700" />
                </div>
                <p className="text-sm text-zinc-500 font-medium">Aucun savoir trouvé dans la bibliothèque.</p>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const colors = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.other;
                return (
                  <motion.div
                    layoutId={`card-${entry.id}`}
                    key={entry.id}
                    className="bg-zinc-900/40 border border-white/5 rounded-[2rem] hover:bg-zinc-900/60 hover:border-white/10 transition-all group flex flex-col relative overflow-hidden"
                  >
                    <div className={`h-0.5 w-full ${colors.accent} opacity-60`} />
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-4 gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {CATEGORIES.find((item) => item.id === entry.category)?.label || entry.category}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                          <button
                            onClick={() => handleOpenManualModal(entry)}
                            className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id, entry.title)}
                            className="p-2 text-zinc-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl border border-white/5 hover:border-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-serif italic font-bold text-lg mb-3 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                        {entry.title}
                      </h3>
                      <p className="text-xs text-zinc-500 flex-1 line-clamp-4 leading-relaxed">{entry.content}</p>

                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                        <div className="text-[10px] font-mono text-zinc-600">
                          {new Date(entry.updated_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">Vectorisé</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-serif italic font-bold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Tester le moteur de recherche sémantique
              </h3>
              <p className="text-sm text-zinc-500">
                Posez une question comme un client. L'IA va transformer votre texte en vecteur et chercher les articles les plus proches mathématiquement.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={simQuery}
                  onChange={(e) => setSimQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                  placeholder="Ex: quelle pièce faut-il contrôler sur une borne qui ne démarre plus ?"
                  className="w-full bg-black/50 border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>
              <button
                onClick={handleSimulate}
                disabled={isSimulating || !simQuery.trim()}
                className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shrink-0"
              >
                {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Lancer le test
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-4">
              {simResults.length > 0 ? `Résultats du moteur (${simResults.length})` : 'En attente de test'}
            </h4>

            <div className="space-y-3">
              {simResults.length === 0 && !isSimulating && (
                <div className="py-20 text-center border-2 border-dashed border-zinc-800/50 rounded-[2rem]">
                  <Zap className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
                  <p className="text-sm text-zinc-600 italic">Entrez une question pour voir ce que l'IA va répondre.</p>
                </div>
              )}

              {simResults.map((result, index) => {
                const colors = CATEGORY_COLORS[result.category] ?? CATEGORY_COLORS.other;
                const score = Math.round(result.similarity * 100);
                return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  key={result.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative group"
                >
                  <div className={`h-0.5 ${colors.accent} opacity-50`} />
                  <div className="p-6 flex flex-col md:flex-row gap-5">
                    <div className="shrink-0 flex flex-col justify-center gap-2 min-w-[80px]">
                      <div className="flex items-end justify-between">
                        <span className={`text-2xl font-black ${colors.text}`}>{score}%</span>
                        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter mb-1">match</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors.accent} transition-all duration-700`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {CATEGORIES.find((c) => c.id === result.category)?.label || result.category}
                        </span>
                        <h5 className="font-serif italic font-bold text-white text-base">{result.title}</h5>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">"{result.content}"</p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => handleOpenManualModal(entries.find((entry) => entry.id === result.id))}
                      className="p-3 bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/20 text-zinc-400 hover:text-purple-400 rounded-2xl transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {index === 0 && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-purple-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-lg">
                        <Check className="w-3 h-3" />
                        Meilleur Match
                      </div>
                    </div>
                  )}
                </motion.div>
              ); })}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              layoutId={modalMode === 'manual' && editingEntry ? `card-${editingEntry.id}` : `${modalMode}-card`}
              className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                  <h3 className="text-xl font-serif italic font-bold">
                    {modalMode === 'pdf'
                      ? 'Importer une notice PDF'
                      : modalMode === 'markdown'
                        ? 'Importer un Vault Obsidian'
                        : editingEntry
                          ? 'Modifier la Connaissance'
                          : 'Ajouter une Connaissance'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {modalMode === 'pdf'
                      ? 'Extraction du texte, découpage intelligent puis vectorisation en 3072 dimensions.'
                      : modalMode === 'markdown'
                        ? 'Importation directe de vos notes Markdown avec nettoyage de la syntaxe Obsidian.'
                        : 'Créez ou modifiez un savoir utilisé par la recherche sémantique.'}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {modalMode === 'pdf' ? (
                  <form id="knowledge-pdf-form" onSubmit={handleImportPdf} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Titre de la notice</label>
                        <input
                          type="text"
                          value={pdfTitle}
                          onChange={(e) => setPdfTitle(e.target.value)}
                          placeholder="Ex: Notice complète Stern Jurassic Park Pro"
                          required
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Catégorie</label>
                        <select
                          value={pdfCategory}
                          onChange={(e) => setPdfCategory(e.target.value)}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                        >
                          {CATEGORIES.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">PDF de notice</label>
                      <label className="block cursor-pointer rounded-[1.5rem] border border-dashed border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-colors p-6">
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
                        <div className="flex flex-col items-center justify-center text-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-950/80 border border-purple-500/20 flex items-center justify-center">
                            <FileUp className="w-5 h-5 text-purple-300" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{pdfFile ? pdfFile.name : 'Cliquer pour choisir un PDF'}</p>
                            <p className="text-xs text-zinc-500 mt-1">Extraction locale du texte puis création automatique de segments RAG.</p>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Chunk cible</p>
                        <p className="mt-2 text-lg font-bold text-white">~{MAX_KNOWLEDGE_CHUNK_CHARS} car.</p>
                        <p className="text-xs text-zinc-500 mt-1">taille par segment avant embedding</p>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Chevauchement</p>
                        <p className="mt-2 text-lg font-bold text-white">{KNOWLEDGE_CHUNK_OVERLAP} car.</p>
                        <p className="text-xs text-zinc-500 mt-1">pour préserver le contexte entre segments</p>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Sortie</p>
                        <p className="mt-2 text-lg font-bold text-white">{selectedCategoryLabel}</p>
                        <p className="text-xs text-zinc-500 mt-1">chaque segment sera stocké dans knowledge_base</p>
                      </div>
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 space-y-2">
                      <p className="text-xs text-purple-300 leading-relaxed">
                        <strong>Pipeline import :</strong> lecture du PDF → extraction texte → découpage intelligent → embedding OpenRouter en <strong>3072 dimensions</strong> → insertion segmentée dans la base de connaissances.
                      </p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Astuce: pour des scans image, faites d’abord un OCR externe avant import.
                      </p>
                    </div>

                    {isImportingPdf && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>Import et vectorisation en cours…</span>
                          <span>{importProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-purple-500 transition-all" style={{ width: `${importProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </form>
                ) : modalMode === 'markdown' ? (
                  <form id="knowledge-markdown-form" onSubmit={handleImportMarkdown} className="space-y-6">
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Importer des notes Obsidian</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Supporte .md avec Frontmatter</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-zinc-800 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all p-8 text-center">
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
                          <FileUp className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
                          <p className="text-sm font-medium text-zinc-300">
                            {markdownFiles.length > 0 
                              ? `${markdownFiles.length} fichier(s) sélectionné(s)` 
                              : 'Sélectionnez vos notes Markdown (.md)'}
                          </p>
                          <p className="text-xs text-zinc-500 mt-2">Vous pouvez en sélectionner plusieurs à la fois</p>
                        </label>

                        {markdownFiles.length > 0 && (
                          <div className="max-h-40 overflow-y-auto bg-black/30 rounded-xl p-3 border border-zinc-800/50">
                            {markdownFiles.slice(0, 10).map((f, i) => (
                              <div key={i} className="text-[10px] text-zinc-500 py-1 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                                {f.name}
                              </div>
                            ))}
                            {markdownFiles.length > 10 && (
                              <div className="text-[10px] text-zinc-600 italic py-1 pl-3">
                                ... et {markdownFiles.length - 10} autres fichiers
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Catégorie par défaut</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                        >
                          {CATEGORIES.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </select>
                        <p className="text-[9px] text-zinc-600 italic">Utilisée si 'category' n'est pas spécifié dans le frontmatter YAML.</p>
                      </div>
                      <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 flex items-start gap-3">
                        <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Le script nettoie automatiquement la syntaxe Obsidian (WikiLinks, callouts, tags) pour optimiser la compréhension de l'IA.
                        </p>
                      </div>
                    </div>

                    {isImportingPdf && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>Import et vectorisation en cours…</span>
                          <span>{importProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-purple-500 transition-all" style={{ width: `${importProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </form>
                ) : (
                  <form id="knowledge-form" onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Titre</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ex: Livraison express en 24h"
                          required
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-serif italic"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Catégorie</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                        >
                          {CATEGORIES.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contenu (Savoir)</label>
                        <span className="text-[10px] text-zinc-600 font-mono">{content.length} caractères</span>
                      </div>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Décrivez précisément l'information que l'IA doit intégrer. Soyez clair, factuel et précis."
                        required
                        rows={10}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4">
                      <p className="text-xs text-purple-300 leading-relaxed">
                        <strong>Info IA :</strong> dès que vous enregistrez, un modèle d'IA analyse ce texte et génère un vecteur mathématique de <strong>3072 dimensions</strong>. Cela permet au BudTender de retrouver cette information intuitivement à partir de questions proches.
                      </p>
                    </div>
                  </form>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5 bg-zinc-900/50">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving || isImportingPdf}
                  className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  form={modalMode === 'pdf' ? 'knowledge-pdf-form' : modalMode === 'markdown' ? 'knowledge-markdown-form' : 'knowledge-form'}
                  type="submit"
                  disabled={isSaving || isImportingPdf}
                  className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving || isImportingPdf ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : modalMode === 'pdf' || modalMode === 'markdown' ? (
                    <FileUp className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {modalMode === 'pdf' || modalMode === 'markdown'
                    ? isImportingPdf
                      ? 'Import en cours...'
                      : modalMode === 'markdown' ? 'Importer les Notes' : 'Importer et vectoriser'
                    : isSaving
                      ? 'Vectorisation en cours...'
                      : 'Enregistrer le Savoir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
