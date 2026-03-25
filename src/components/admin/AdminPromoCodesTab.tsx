import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    Tag, Plus, Pencil, Trash2, X, CheckCircle2, Clock, Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PromoCode {
    id: string;
    code: string;
    description: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_order_value: number;
    max_uses: number | null;
    uses_count: number;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
}

const EMPTY_FORM = {
    code: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    min_order_value: '0',
    max_uses: '',
    expires_at: '',
    is_active: true,
};

export default function AdminPromoCodesTab() {
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<PromoCode | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const fetchCodes = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setCodes(data as PromoCode[]);
        setLoading(false);
    };

    useEffect(() => { fetchCodes(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setSaveError('');
        setShowForm(true);
    };

    const openEdit = (code: PromoCode) => {
        setEditing(code);
        setForm({
            code: code.code,
            description: code.description ?? '',
            discount_type: code.discount_type,
            discount_value: String(code.discount_value),
            min_order_value: String(code.min_order_value),
            max_uses: code.max_uses !== null ? String(code.max_uses) : '',
            expires_at: code.expires_at ? code.expires_at.slice(0, 10) : '',
            is_active: code.is_active,
        });
        setSaveError('');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.discount_value) {
            setSaveError('Le code et la valeur de réduction sont requis.');
            return;
        }
        setSaving(true);
        setSaveError('');

        const payload = {
            code: form.code.trim().toUpperCase(),
            description: form.description || null,
            discount_type: form.discount_type,
            discount_value: parseFloat(form.discount_value),
            min_order_value: parseFloat(form.min_order_value || '0'),
            max_uses: form.max_uses ? parseInt(form.max_uses) : null,
            expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
            is_active: form.is_active,
        };

        let error;
        if (editing) {
            ({ error } = await supabase.from('promo_codes').update(payload).eq('id', editing.id));
        } else {
            ({ error } = await supabase.from('promo_codes').insert(payload));
        }

        setSaving(false);
        if (error) {
            setSaveError(error.message.includes('unique') ? 'Ce code existe déjà.' : error.message);
            return;
        }

        setShowForm(false);
        fetchCodes();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer ce code promo ?')) return;
        await supabase.from('promo_codes').delete().eq('id', id);
        setCodes((prev) => prev.filter((c) => c.id !== id));
    };

    const handleToggle = async (code: PromoCode) => {
        await supabase.from('promo_codes').update({ is_active: !code.is_active }).eq('id', code.id);
        setCodes((prev) => prev.map((c) => c.id === code.id ? { ...c, is_active: !c.is_active } : c));
    };

    const isExpired = (c: PromoCode) => c.expires_at ? new Date(c.expires_at) < new Date() : false;
    const isFull = (c: PromoCode) => c.max_uses !== null && c.uses_count >= c.max_uses;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-serif text-2xl font-bold">Codes Promo</h2>
                    <p className="text-zinc-400 text-sm mt-0.5">{codes.length} code{codes.length !== 1 ? 's' : ''} configuré{codes.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-green-400 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nouveau code
                </button>
            </div>

            {/* Form modal */}
            {showForm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-serif text-xl font-bold">
                                {editing ? 'Modifier le code' : 'Nouveau code promo'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Code */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Code *</label>
                                <input
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    placeholder="EX : WEEDKEND-20"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Description</label>
                                <input
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Ex : Offre de bienvenue"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>

                            {/* Discount type + value */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Type *</label>
                                    <select
                                        value={form.discount_type}
                                        onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                    >
                                        <option value="percent">Pourcentage (%)</option>
                                        <option value="fixed">Montant fixe (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                                        Valeur * {form.discount_type === 'percent' ? '(%)' : '(€)'}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.discount_value}
                                        onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                                        placeholder={form.discount_type === 'percent' ? '10' : '5.00'}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                            </div>

                            {/* Min order + max uses */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Commande min (€)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.min_order_value}
                                        onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                                        placeholder="0"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Utilisations max</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={form.max_uses}
                                        onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                                        placeholder="Illimité"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                            </div>

                            {/* Expires at + active */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Expiration</label>
                                    <input
                                        type="date"
                                        value={form.expires_at}
                                        onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-0.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Actif</label>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${form.is_active
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                            }`}
                                    >
                                        {form.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                        {form.is_active ? 'Actif' : 'Inactif'}
                                    </button>
                                </div>
                            </div>

                            {saveError && (
                                <p className="text-xs text-red-400">{saveError}</p>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-colors"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editing ? 'Sauvegarder' : 'Créer le code'}
                                </button>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 text-zinc-400 hover:text-white text-sm transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Chargement…
                </div>
            ) : codes.length === 0 ? (
                <div className="text-center py-16 text-zinc-500">
                    <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Aucun code promo. Créez votre premier code.</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Code</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Réduction</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Min.</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Utilisations</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Expiration</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Statut</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {codes.map((code) => {
                                const expired = isExpired(code);
                                const full = isFull(code);
                                const statusOk = code.is_active && !expired && !full;

                                return (
                                    <tr key={code.id} className="bg-zinc-950 hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-bold text-white tracking-wider">{code.code}</span>
                                            {code.description && (
                                                <p className="text-xs text-zinc-500 mt-0.5">{code.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-emerald-400">
                                            {code.discount_type === 'percent'
                                                ? `−${code.discount_value}%`
                                                : `−${parseFloat(String(code.discount_value)).toFixed(2)} €`}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400">
                                            {parseFloat(String(code.min_order_value)) > 0
                                                ? `${parseFloat(String(code.min_order_value)).toFixed(2)} €`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400">
                                            {code.uses_count}
                                            {code.max_uses !== null ? ` / ${code.max_uses}` : ' / ∞'}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400">
                                            {code.expires_at
                                                ? (
                                                    <span className={`flex items-center gap-1 ${expired ? 'text-red-400' : ''}`}>
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(code.expires_at).toLocaleDateString('fr-FR')}
                                                    </span>
                                                )
                                                : '∞'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusOk
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                                }`}>
                                                {statusOk ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {expired ? 'Expiré' : full ? 'Épuisé' : code.is_active ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => handleToggle(code)}
                                                    title={code.is_active ? 'Désactiver' : 'Activer'}
                                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                                >
                                                    {code.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => openEdit(code)}
                                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(code.id)}
                                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
