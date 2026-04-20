import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Clock, Calendar, ChevronRight, Play, AlertCircle, RefreshCw } from 'lucide-react';
import AccountPageLayout from '../components/AccountPageLayout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useBudtenderStore } from '../store/budtenderStore';
import type { BudTenderSession, TranscriptMessage, RecommendedProduct } from '../types/budtenderSession';

/* ── Pure utility functions (exported for testing) ─────────────────── */

export type PeriodFilter = '7d' | '30d' | 'all';

export function sortSessions(sessions: BudTenderSession[]): BudTenderSession[] {
  return [...sessions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );
}

export function filterSessionsByPeriod(
  sessions: BudTenderSession[],
  period: PeriodFilter
): BudTenderSession[] {
  if (period === 'all') return sessions;
  const days = period === '7d' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sessions.filter(s => new Date(s.started_at) >= cutoff);
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFirstAssistantPreview(transcript: TranscriptMessage[]): string {
  const msg = transcript.find(m => m.role === 'assistant' && m.text.trim().length > 0);
  if (!msg) return 'Conversation démarrée';
  return msg.text.length > 80 ? msg.text.slice(0, 80) + '…' : msg.text;
}

/* ── SessionCard ────────────────────────────────────────────────────── */

interface SessionCardProps {
  session: BudTenderSession;
  isSelected: boolean;
  onClick: () => void;
}

export function SessionCard({ session, isSelected, onClick }: SessionCardProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-left rounded-2xl p-4 transition-all duration-300 border"
      style={{
        background: isSelected
          ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-card))'
          : 'color-mix(in srgb, var(--color-card) 80%, transparent)',
        borderColor: isSelected
          ? 'color-mix(in srgb, var(--color-primary) 40%, transparent)'
          : 'color-mix(in srgb, var(--color-border) 100%, transparent)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Date */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-[color:var(--color-primary)] shrink-0" />
            <span
              className="text-[11px] text-[color:var(--color-text-muted)] truncate"
              style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}
            >
              {formatDate(session.started_at)}
            </span>
          </div>

          {/* Preview */}
          <p className="text-sm text-[color:var(--color-text)] line-clamp-2 mb-2">
            {getFirstAssistantPreview(session.transcript)}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-[color:var(--color-text-muted)]">
              <Clock className="w-3 h-3" />
              {formatDuration(session.duration_sec)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[color:var(--color-text-muted)]">
              <MessageSquare className="w-3 h-3" />
              {session.transcript.length} messages
            </span>
          </div>
        </div>

        <ChevronRight
          className="w-4 h-4 shrink-0 mt-1 transition-transform duration-300"
          style={{ color: 'var(--color-text-muted)', transform: isSelected ? 'rotate(90deg)' : undefined }}
        />
      </div>
    </motion.button>
  );
}

/* ── SessionDetail ──────────────────────────────────────────────────── */

interface SessionDetailProps {
  session: BudTenderSession;
  onRelaunch: (session: BudTenderSession) => void;
}

function SessionDetail({ session, onRelaunch }: SessionDetailProps) {
  const filtered = session.transcript.filter(m => m.text.trim().length > 0);

  return (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
      }}
    >
      {/* Detail header */}
      <div className="px-5 py-4 border-b border-[color:var(--color-border)] flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[color:var(--color-text)]">
            {formatDate(session.started_at)}
          </p>
          <p className="text-[11px] text-[color:var(--color-text-muted)] mt-0.5">
            Durée : {formatDuration(session.duration_sec)} · {session.transcript.length} messages
          </p>
        </div>
        <button
          onClick={() => onRelaunch(session)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            color: 'var(--color-primary)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <Play className="w-3.5 h-3.5" />
          Relancer
        </button>
      </div>

      {/* Transcript */}
      <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-muted)] text-center py-4">
            Aucun message dans cette session.
          </p>
        ) : (
          filtered.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <span
                className={`rounded-xl px-3 py-2 text-sm max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-[color:var(--color-primary)]/15 text-right'
                    : 'bg-slate-100 dark:bg-white/5 text-left'
                }`}
              >
                {msg.text}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Recommended products */}
      {session.recommended_products.length > 0 && (
        <div className="px-4 pb-4 border-t border-[color:var(--color-border)] pt-4">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] mb-3"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Produits recommandés
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {session.recommended_products.map((product) => (
              <Link
                key={product.id}
                to={`/catalogue/${product.slug}`}
                className="flex flex-col gap-1 rounded-xl p-3 transition-all duration-300 hover:scale-[1.02] border"
                style={{
                  background: 'color-mix(in srgb, var(--color-bg) 60%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 100%, transparent)',
                }}
              >
                <span className="text-xs font-semibold text-[color:var(--color-text)] line-clamp-2">
                  {product.name}
                </span>
                <span className="text-[11px] text-[color:var(--color-primary)] font-bold">
                  {product.price.toFixed(2)} €
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */

export default function BudTenderHistory() {
  const { user } = useAuthStore();
  const { setProactiveGreeting, openVoice } = useBudtenderStore();

  const [sessions, setSessions] = useState<BudTenderSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<BudTenderSession | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('budtender_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSessions((data as BudTenderSession[]) ?? []);
    } catch (err) {
      setError('Impossible de charger vos conversations. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRelaunch = useCallback((session: BudTenderSession) => {
    const productNames = session.recommended_products.map(p => p.name).join(', ');
    const greeting = productNames
      ? `Bonjour ! Lors de notre dernière conversation le ${formatDate(session.started_at)}, nous avons discuté de ${productNames}. Souhaitez-vous continuer sur ce sujet ou explorer autre chose ?`
      : `Bonjour ! Souhaitez-vous reprendre là où nous nous étions arrêtés le ${formatDate(session.started_at)} ?`;
    setProactiveGreeting(greeting);
    openVoice();
  }, [setProactiveGreeting, openVoice]);

  const filtered = filterSessionsByPeriod(sessions, periodFilter);

  const periodButtons: { label: string; value: PeriodFilter }[] = [
    { label: '7j', value: '7d' },
    { label: '30j', value: '30d' },
    { label: 'Tout', value: 'all' },
  ];

  return (
    <AccountPageLayout
      seoTitle="Historique BudTender"
      seoDescription="Consultez vos conversations passées avec le BudTender IA"
      icon={MessageSquare}
      iconColor="#10b981"
      title="Historique BudTender"
      subtitle="Vos conversations passées avec l'assistant IA"
      stat={sessions.length}
      statLabel="Sessions"
      footerText="Données protégées & chiffrées"
    >
      {/* Period filter */}
      <div className="flex items-center gap-2">
        {periodButtons.map(btn => (
          <button
            key={btn.value}
            onClick={() => setPeriodFilter(btn.value)}
            className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: periodFilter === btn.value
                ? 'var(--color-primary)'
                : 'color-mix(in srgb, var(--color-card) 80%, transparent)',
              color: periodFilter === btn.value
                ? 'var(--color-primary-contrast)'
                : 'var(--color-text-muted)',
              border: `1px solid ${periodFilter === btn.value
                ? 'var(--color-primary)'
                : 'color-mix(in srgb, var(--color-border) 100%, transparent)'}`,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-16 text-center"
        >
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-[color:var(--color-text-muted)]">{error}</p>
          <button
            onClick={fetchSessions}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-16 text-center"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, #10b981 10%, transparent)', border: '1px solid color-mix(in srgb, #10b981 20%, transparent)' }}
          >
            <MessageSquare className="w-8 h-8" style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-lg font-semibold text-[color:var(--color-text)] mb-1">
              {sessions.length === 0 ? 'Aucune conversation pour le moment' : 'Aucune session sur cette période'}
            </p>
            <p className="text-sm text-[color:var(--color-text-muted)]">
              {sessions.length === 0
                ? 'Démarrez votre première conversation avec le BudTender IA.'
                : 'Essayez une période plus large.'}
            </p>
          </div>
          {sessions.length === 0 && (
            <Link
              to="/catalogue"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-primary-contrast)',
              }}
            >
              Découvrir le catalogue
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session list */}
          <div className="space-y-3">
            {filtered.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                isSelected={selectedSession?.id === session.id}
                onClick={() => setSelectedSession(prev => prev?.id === session.id ? null : session)}
              />
            ))}
          </div>

          {/* Session detail */}
          <div className="lg:sticky lg:top-24 self-start">
            <AnimatePresence mode="wait">
              {selectedSession ? (
                <SessionDetail
                  key={selectedSession.id}
                  session={selectedSession}
                  onRelaunch={handleRelaunch}
                />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
                  style={{
                    background: 'color-mix(in srgb, var(--color-card) 40%, transparent)',
                    border: '1px dashed color-mix(in srgb, var(--color-border) 100%, transparent)',
                  }}
                >
                  <ChevronRight className="w-8 h-8 text-[color:var(--color-text-muted)] mb-2" />
                  <p className="text-sm text-[color:var(--color-text-muted)]">
                    Sélectionnez une session pour voir le détail
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </AccountPageLayout>
  );
}
