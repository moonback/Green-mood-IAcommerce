import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Save, X, Newspaper, Info, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { slugify } from '../../lib/utils';
import { useToastStore } from '../../store/toastStore';

type BlogStorageMode = 'blog_posts' | 'knowledge_base';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const INPUT =
  'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-primary transition-colors';
const LABEL = 'block text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wider';

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  is_published: false,
};

function isMissingBlogTableError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const hint = String(error.hint || '').toLowerCase();
  return (
    String(error.code || '') === 'PGRST205'
    || msg.includes('blog_posts')
    || details.includes('blog_posts')
    || hint.includes('blog_posts')
    || msg.includes('404')
  );
}

function mapKbToBlogPost(row: any): BlogPost {
  const category = String(row.category || 'blog');
  const isPublished = category === 'blog';
  return {
    id: row.id,
    title: row.title,
    slug: slugify(row.title),
    excerpt: row.content ? String(row.content).slice(0, 155) : null,
    content: row.content || '',
    is_published: isPublished,
    published_at: isPublished ? row.updated_at : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export default function AdminBlogTab() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [storageMode, setStorageMode] = useState<BlogStorageMode>('blog_posts');
  const [isGeneratingGuides, setIsGeneratingGuides] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const loadFromBlogPosts = async () => {
    const { data, error } = await supabase.from('blog_posts').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data as BlogPost[]) ?? []);
  };

  const loadFromKnowledgeBase = async () => {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, title, content, category, created_at, updated_at')
      .in('category', ['blog', 'blog_draft'])
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data as any[]) ?? []).map(mapKbToBlogPost);
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      if (storageMode === 'blog_posts') {
        const rows = await loadFromBlogPosts();
        setPosts(rows);
      } else {
        const rows = await loadFromKnowledgeBase();
        setPosts(rows);
      }
    } catch (error: any) {
      if (storageMode === 'blog_posts' && isMissingBlogTableError(error)) {
        setStorageMode('knowledge_base');
        addToast({ type: 'info', message: 'Table blog_posts absente: bascule automatique sur knowledge_base.' });
        try {
          const rows = await loadFromKnowledgeBase();
          setPosts(rows);
        } catch (kbError: any) {
          addToast({ type: 'error', message: `Erreur chargement blog (fallback): ${kbError.message}` });
          setPosts([]);
        }
      } else {
        addToast({ type: 'error', message: `Erreur chargement blog: ${error.message}` });
        setPosts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageMode]);

  const filtered = useMemo(() => posts.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  }), [posts, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content,
      is_published: post.is_published,
    });
    setShowModal(true);
  };

  const saveInBlogPosts = async (payload: any) => {
    if (editingId) return supabase.from('blog_posts').update(payload).eq('id', editingId);
    return supabase.from('blog_posts').insert(payload);
  };

  const saveInKnowledgeBase = async (payload: any) => {
    const kbPayload = {
      title: payload.title,
      content: payload.content,
      category: payload.is_published ? 'blog' : 'blog_draft',
    };
    if (editingId) return supabase.from('knowledge_base').update(kbPayload).eq('id', editingId);
    return supabase.from('knowledge_base').insert(kbPayload);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      addToast({ type: 'error', message: 'Titre et contenu sont requis.' });
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: (form.slug || slugify(form.title)).trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim(),
      is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
    };

    setIsSaving(true);
    let error: any = null;

    if (storageMode === 'blog_posts') {
      const res = await saveInBlogPosts(payload);
      error = res.error;
      if (error && isMissingBlogTableError(error)) {
        setStorageMode('knowledge_base');
        const fallbackRes = await saveInKnowledgeBase(payload);
        error = fallbackRes.error;
      }
    } else {
      const res = await saveInKnowledgeBase(payload);
      error = res.error;
    }

    setIsSaving(false);

    if (error) {
      addToast({ type: 'error', message: `Erreur sauvegarde: ${error.message}` });
      return;
    }

    addToast({ type: 'success', message: editingId ? 'Article mis à jour.' : 'Article créé.' });
    setShowModal(false);
    loadPosts();
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Supprimer l'article "${post.title}" ?`)) return;

    let error: any = null;
    if (storageMode === 'blog_posts') {
      const res = await supabase.from('blog_posts').delete().eq('id', post.id);
      error = res.error;
      if (error && isMissingBlogTableError(error)) {
        setStorageMode('knowledge_base');
        const fallbackRes = await supabase.from('knowledge_base').delete().eq('id', post.id);
        error = fallbackRes.error;
      }
    } else {
      const res = await supabase.from('knowledge_base').delete().eq('id', post.id);
      error = res.error;
    }

    if (error) {
      addToast({ type: 'error', message: `Erreur suppression: ${error.message}` });
      return;
    }

    addToast({ type: 'success', message: 'Article supprimé.' });
    loadPosts();
  };

  const handleGenerateGuides = async () => {
    setIsGeneratingGuides(true);
    try {
      const response = await fetch('/__admin/blog-generate', { method: 'POST' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = payload?.message || "Impossible d'exécuter npm run blog:generate.";
        addToast({ type: 'error', message });
        return;
      }

      addToast({ type: 'success', message: payload?.message || 'Guides générés avec succès.' });
    } catch (error: any) {
      addToast({ type: 'error', message: `Erreur génération blog: ${error.message}` });
    } finally {
      setIsGeneratingGuides(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-emerald-400" />
            Blog & SEO
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Voir le bloc blog et gérer vos articles (CRUD).</p>
          <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1">
            <Info className="w-3 h-3" />
            Stockage actif: <span className="font-mono text-zinc-400">{storageMode}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className={`${INPUT} pl-10 w-64`}
            />
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm">
            <Plus className="w-4 h-4" />
            Nouvel article
          </button>
          <button
            onClick={handleGenerateGuides}
            disabled={isGeneratingGuides}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingGuides ? 'animate-spin' : ''}`} />
            {isGeneratingGuides ? 'Génération...' : 'Exécuter blog:generate'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-zinc-400">Chargement des articles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-zinc-400">Aucun article trouvé.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filtered.map((post) => (
              <div key={post.id} className="p-4 flex items-start justify-between gap-4 hover:bg-zinc-800/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white truncate">{post.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${post.is_published ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-zinc-400 border-zinc-700 bg-zinc-800'}`}>
                      {post.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono mt-1">/guides/{post.slug}</p>
                  {post.excerpt && <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{post.excerpt}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/guides/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-emerald-300 hover:bg-zinc-800"
                    title="Voir l'article"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button onClick={() => openEdit(post)} className="p-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(post)} className="p-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-700 rounded-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="font-bold text-white">{editingId ? 'Modifier article' : 'Créer article'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className={LABEL}>Titre *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value, slug: slugify(e.target.value) }))}
                  className={INPUT}
                  required
                />
              </div>
              <div>
                <label className={LABEL}>Slug *</label>
                <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} className={INPUT} required />
              </div>
              <div>
                <label className={LABEL}>Extrait (meta description)</label>
                <textarea rows={2} value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Contenu *</label>
                <textarea rows={10} value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} className={INPUT} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))} className="w-4 h-4 accent-emerald-500" />
                Publier cet article
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300">Annuler</button>
                <button disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold disabled:opacity-60">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
