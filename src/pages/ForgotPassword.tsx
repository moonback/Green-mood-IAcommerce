import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SEO from '../components/SEO';
import { useSettingsStore } from '../store/settingsStore';

export default function ForgotPassword() {
  const settings = useSettingsStore((s) => s.settings);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSuccess('Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.');
      setEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={`Mot de passe oublié — ${settings.store_name}`}
        description={`Recevez un lien de réinitialisation de mot de passe pour votre compte ${settings.store_name}.`}
      />

      <div className="min-h-[calc(100vh-10rem)] bg-[color:var(--color-bg)] flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[color:var(--color-card)] rounded-2xl p-8 border border-[color:var(--color-border)]">
            <h1 className="text-2xl font-semibold text-[color:var(--color-text)] mb-2">Mot de passe oublié</h1>
            <p className="text-[color:var(--color-text-muted)] text-sm mb-6">
              Saisissez votre email pour recevoir un lien de réinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[color:var(--color-text-muted)] mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-text-subtle)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.fr"
                    className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-xl pl-10 pr-4 py-3 text-[color:var(--color-text)] placeholder-[color:var(--color-text-subtle)] focus:outline-none focus:border-[color:var(--color-primary)] transition-colors"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-900/30 border border-green-700 rounded-xl px-4 py-3 text-green-400 text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[color:var(--color-primary)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[color:var(--color-text)] font-semibold py-3 rounded-xl transition-colors"
              >
                {isLoading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </button>
            </form>

            <p className="text-center text-[color:var(--color-text-subtle)] text-sm mt-6">
              <Link to="/connexion" className="text-[color:var(--color-primary)] hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
