import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Search, AlertCircle, RefreshCw, 
  Stethoscope, Save, X, Info, ExternalLink, Activity,
  Database, Zap, Check, FileText, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CannabisCondition } from '../../lib/types';
import { generateEmbedding } from '../../lib/embeddings';

export default function AdminCannabisConditionsTab() {
  const [conditions, setConditions] = useState<CannabisCondition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 19;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCondition, setEditingCondition] = useState<CannabisCondition | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CannabisCondition>>({
    condition: '',
    alternate_name: '',
    evidence_score: 1,
    popular_interest: 0,
    scholar_citations: 0,
    cbd_effect: '',
    simple_notes: '',
    scientific_notes: '',
    study_link: '',
    source_name: ''
  });
  const [vectorText, setVectorText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  const loadConditions = async () => {
    setIsLoading(true);
    try {
      // Load knowledge entries and their associated vectors
      const { data, error } = await supabase
        .from('cannabis_conditions')
        .select('*, vector:cannabis_conditions_vectors(*)')
        .order('condition');

      if (error) throw error;
      
      const formattedData = (data as any[] || []).map(item => ({
        ...item,
        vector: Array.isArray(item.vector) ? item.vector[0] : item.vector
      }));
      
      console.log("[AdminCannabisConditions] Loaded knowledge entries:", formattedData.length);
      setConditions(formattedData as CannabisCondition[]);
    } catch (err) {
      console.error('Erreur lors du chargement des informations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConditions();
  }, []);

  const handleOpenModal = (condition?: CannabisCondition) => {
    setError(null);
    if (condition) {
      setEditingCondition(condition);
      setFormData({
        condition: condition.condition,
        alternate_name: condition.alternate_name || '',
        evidence_score: condition.evidence_score,
        popular_interest: condition.popular_interest || 0,
        scholar_citations: condition.scholar_citations || 0,
        cbd_effect: condition.cbd_effect || '',
        simple_notes: condition.simple_notes || '',
        scientific_notes: condition.scientific_notes || '',
        study_link: condition.study_link || '',
        source_name: condition.source_name || ''
      });
      setVectorText(condition.vector?.text_content || '');
    } else {
      setEditingCondition(null);
      setFormData({
        condition: '',
        alternate_name: '',
        evidence_score: 1,
        popular_interest: 0,
        scholar_citations: 0,
        cbd_effect: '',
        simple_notes: '',
        scientific_notes: '',
        study_link: '',
        source_name: ''
      });
      setVectorText('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCondition(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.condition?.trim()) {
      setError("Le nom de l'information est obligatoire.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let conditionId = editingCondition?.id;

      if (editingCondition) {
        // Update knowledge entry
        const { error: updateError } = await supabase
          .from('cannabis_conditions')
          .update(formData)
          .eq('id', conditionId);

        if (updateError) throw updateError;
      } else {
        // Insert knowledge entry
        const { data: newData, error: insertError } = await supabase
          .from('cannabis_conditions')
          .insert(formData)
          .select()
          .single();

        if (insertError) throw insertError;
        conditionId = newData.id;
      }

      // Handle Vector embedding if text provided
      if (vectorText.trim()) {
        const embedding = await generateEmbedding(vectorText);
        
        const { error: vectorError } = await supabase
          .from('cannabis_conditions_vectors')
          .upsert({
            condition_id: conditionId,
            text_content: vectorText,
            embedding
          }, { onConflict: 'condition_id' });

        if (vectorError) throw vectorError;
      } else if (editingCondition?.vector) {
        // If vectorText is cleared, we might want to delete the vector? 
        // For now, let's just keep it as is or show an alert.
      }

      await loadConditions();
      handleCloseModal();
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde de l'information:", err);
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`T'es-tu sûr de vouloir supprimer l'information "${name}" ?`)) return;

    try {
      const { error } = await supabase
        .from('cannabis_conditions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setConditions(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  const handleAISuggestion = async () => {
    if (!formData.condition?.trim()) {
      setError("Ajoutez d'abord un nom d'information pour permettre la recherche IA.");
      return;
    }

    setError(null);
    setIsAiSuggesting(true);

    const prompt = `
Tu es un assistant expert en machines, arcade et équipements de divertissement.
Je veux que tu fasses une recherche web pour trouver des informations pertinentes et réalistes sur l'élément suivant :
- Nom: ${formData.condition}
- Nom alternatif: ${formData.alternate_name || 'N/A'}

Réponds UNIQUEMENT en JSON valide, sans markdown, avec ce format:
{
  "cbd_effect": "bénéfice/usage principal en 1 phrase",
  "simple_notes": "résumé simple pour un commercial (2-4 phrases)",
  "scientific_notes": "détails techniques plus précis (2-4 phrases)",
  "study_link": "url la plus pertinente",
  "source_name": "nom du site/source principale",
  "popular_interest": 0,
  "scholar_citations": 0,
  "vector_text": "texte enrichi pour embedding (4-7 phrases structurées pour la recherche sémantique)"
}

Contraintes:
- Langue française.
- Si une donnée est inconnue, mets une valeur vide (""), mais garde toutes les clés.
- N'invente pas des informations impossibles.
`;

    try {
      const { data, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: {
          model: 'mistralai/mistral-small-creative',
          messages: [{ role: 'user', content: prompt }]
        }
      });

      if (aiError) throw new Error(aiError.message);

      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Réponse IA vide.');

      const jsonString = content.replace(/```json\s?|```/g, '').trim();
      const parsed = JSON.parse(jsonString) as Partial<Record<string, string | number>>;

      setFormData(prev => ({
        ...prev,
        cbd_effect: typeof parsed.cbd_effect === 'string' ? parsed.cbd_effect : prev.cbd_effect || '',
        simple_notes: typeof parsed.simple_notes === 'string' ? parsed.simple_notes : prev.simple_notes || '',
        scientific_notes: typeof parsed.scientific_notes === 'string' ? parsed.scientific_notes : prev.scientific_notes || '',
        study_link: typeof parsed.study_link === 'string' ? parsed.study_link : prev.study_link || '',
        source_name: typeof parsed.source_name === 'string' ? parsed.source_name : prev.source_name || '',
        popular_interest: typeof parsed.popular_interest === 'number' ? parsed.popular_interest : prev.popular_interest || 0,
        scholar_citations: typeof parsed.scholar_citations === 'number' ? parsed.scholar_citations : prev.scholar_citations || 0,
      }));

      if (typeof parsed.vector_text === 'string' && parsed.vector_text.trim()) {
        setVectorText(parsed.vector_text);
      }
    } catch (err: any) {
      console.error('Erreur suggestion IA:', err);
      setError(err.message || 'Impossible de générer une suggestion IA pour le moment.');
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const filteredConditions = conditions.filter(c => 
    c.condition.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.alternate_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.simple_notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredConditions.length / itemsPerPage);
  const paginatedConditions = filteredConditions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const cleanedVectorText = vectorText.trim();
  const isVectorPersisted = !!editingCondition?.vector?.embedding;
  const vectorQuality = cleanedVectorText.length >= 300
    ? { label: 'Qualité élevée', color: 'text-emerald-400' }
    : cleanedVectorText.length >= 150
      ? { label: 'Qualité correcte', color: 'text-amber-300' }
      : { label: 'Qualité faible', color: 'text-red-400' };

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic font-bold">Machines & Informations</h2>
            <p className="text-xs text-zinc-500">Base de connaissances pour vos machines, équipements et informations techniques.</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Information
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une machine, un équipement ou un alias..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] h-64 animate-pulse" />
          ))
        ) : filteredConditions.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
              <Stethoscope className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-500 font-medium">Aucune information trouvée.</p>
          </div>
        ) : (
          paginatedConditions.map((item) => (
            <motion.div
              layoutId={`card-${item.id}`}
              key={item.id}
              className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 hover:bg-zinc-900/60 hover:border-white/10 transition-all group flex flex-col relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md border border-blue-400/10">
                    Score: {item.evidence_score}/6
                  </span>
                  {item.vector && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/10 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> IA
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.condition)}
                    className="p-2 text-zinc-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl border border-white/5 hover:border-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-serif italic font-bold text-lg mb-1 group-hover:text-blue-100 transition-colors">
                {item.condition}
              </h3>
              {item.alternate_name && (
                <p className="text-[10px] text-zinc-500 mb-3 font-medium uppercase tracking-wider">{item.alternate_name}</p>
              )}
              
              <p className="text-xs text-zinc-400 flex-1 line-clamp-3 leading-relaxed mb-4">
                {item.simple_notes || "Aucune note disponible."}
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                   <div className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5">Intérêt Public</div>
                   <div className="text-xs font-bold text-zinc-300">{item.popular_interest || 0}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                   <div className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5">Citations</div>
                   <div className="text-xs font-bold text-zinc-300">{item.scholar_citations || 0}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <div className="text-[9px] font-mono text-zinc-600 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  ID: {item.id.substring(0, 8)}...
                </div>
                {item.study_link && (
                  <a 
                    href={item.study_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-xl font-bold text-xs border transition-all ${
                  currentPage === i + 1
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Modal */}
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
              layoutId={editingCondition ? `card-${editingCondition.id}` : 'new-card'}
              className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="flex items-center justify-between p-8 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-serif italic font-bold">
                    {editingCondition ? `Modifier: ${editingCondition.condition}` : 'Ajouter une Information'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <form id="condition-form" onSubmit={handleSave} className="space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                       <Info className="w-3 h-3" /> Informations Générales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nom de l'information</label>
                        <input
                          type="text"
                          value={formData.condition}
                          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                          placeholder="Ex: Flipper Stern Pro"
                          required
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-serif italic"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nom Alternatif</label>
                        <input
                          type="text"
                          value={formData.alternate_name || ''}
                          onChange={(e) => setFormData({ ...formData, alternate_name: e.target.value })}
                          placeholder="Ex: Borne d'arcade"
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Score de pertinence (0-6)</label>
                        <input
                          type="number"
                          min="0"
                          max="6"
                          value={formData.evidence_score}
                          onChange={(e) => setFormData({ ...formData, evidence_score: parseInt(e.target.value) })}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Niveau d'intérêt</label>
                      <input
                        type="number"
                        value={formData.popular_interest || 0}
                        onChange={(e) => setFormData({ ...formData, popular_interest: parseInt(e.target.value) })}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Références techniques</label>
                      <input
                        type="number"
                        value={formData.scholar_citations || 0}
                        onChange={(e) => setFormData({ ...formData, scholar_citations: parseInt(e.target.value) })}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                       <FileText className="w-3 h-3" /> Description & Détails
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Usage / bénéfice</label>
                      <input
                        type="text"
                        value={formData.cbd_effect || ''}
                        onChange={(e) => setFormData({ ...formData, cbd_effect: e.target.value })}
                        placeholder="Ex: Idéal pour zone familiale, simple à prendre en main"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notes Simples</label>
                        <textarea
                          value={formData.simple_notes || ''}
                          onChange={(e) => setFormData({ ...formData, simple_notes: e.target.value })}
                          rows={4}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                        />
                      </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notes Scientifiques</label>
                      <textarea
                          value={formData.scientific_notes || ''}
                          onChange={(e) => setFormData({ ...formData, scientific_notes: e.target.value })}
                          rows={4}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAISuggestion}
                        disabled={isAiSuggesting}
                        className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAiSuggesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {isAiSuggesting ? 'Recherche IA...' : 'Suggérer avec IA + Internet'}
                      </button>
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lien de référence</label>
                      <input
                        type="url"
                        value={formData.study_link || ''}
                        onChange={(e) => setFormData({ ...formData, study_link: e.target.value })}
                        placeholder="https://fabricant.com/fiche-technique"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nom de la Source</label>
                      <input
                        type="text"
                        value={formData.source_name || ''}
                        onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                        placeholder="Ex: Fabricant / Notice interne"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Vector Content */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Intelligence Artificielle (Embedding)
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-600 font-mono">
                          {vectorText.length} caractères
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 space-y-4">
                      <p className="text-xs text-emerald-400 leading-relaxed italic">
                        Le texte ci-dessous sera transformé en vecteur mathématique pour permettre à l'IA de retrouver cette information machine lors d'une conversation.
                      </p>

                      <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-xs space-y-1">
                        <p className="text-zinc-300">
                          Statut vectorisation :{' '}
                          <span className={isVectorPersisted ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                            {isVectorPersisted ? 'Vecteur déjà sauvegardé en base' : 'Pas encore sauvegardé'}
                          </span>
                        </p>
                        <p className="text-zinc-400">
                          Prochaine sauvegarde :{' '}
                          <span className={cleanedVectorText ? 'text-blue-300 font-semibold' : 'text-zinc-500'}>
                            {cleanedVectorText ? 'vectorisation prévue (embedding généré)' : 'aucune vectorisation (texte vide)'}
                          </span>
                        </p>
                        <p className="text-zinc-400">
                          Qualité du texte : <span className={`${vectorQuality.color} font-semibold`}>{vectorQuality.label}</span>
                        </p>
                      </div>

                      <textarea
                        value={vectorText}
                        onChange={(e) => setVectorText(e.target.value)}
                        placeholder="Décrivez ici la machine, ses caractéristiques, son utilisation et sa maintenance pour l'IA..."
                        rows={6}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex items-center justify-end gap-3 p-8 border-t border-white/5 bg-zinc-900/50">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  form="condition-form"
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-black px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Traitement en cours...' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
