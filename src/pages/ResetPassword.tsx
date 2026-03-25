import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import SEO from '../components/SEO';

export default function ResetPassword() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const settings = useSettingsStore((s) => s.settings);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasMinPasswordLength = password.length >= 8;
  const hasLetter = /[A-Za-zÀ-ÿ]/.test(password);
  const hasNumber = /\d/.test(password);

  useEffect(() => {
    if (!isAuthLoading && !session) {
      setError('Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.');
    }
  }, [isAuthLoading, session]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!session) {
      setError('Session de réinitialisation introuvable. Recommencez depuis le lien email.');
      return;
    }

    if (!hasMinPasswordLength || !hasLetter || !hasNumber) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword(password);
      setSuccess('Votre mot de passe a bien été mis à jour.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/connexion'), 1200);
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
        title={`Nouveau mot de passe — ${settings.store_name}`}
        description={`Définissez un nouveau mot de passe pour votre compte ${settings.store_name}.`}
      />

      <div className="min-h-[calc(100vh-10rem)] bg-[color:var(--color-bg)] flex items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-[color:var(--color-card)] rounded-2xl p-8 border border-[color:var(--color-border)]">
            <h1 className="text-2xl font-semibold text-[color:var(--color-text)] mb-2">Créer un nouveau mot de passe</h1>
            <p className="text-[color:var(--color-text-muted)] text-sm mb-6">
              Après validation, vous pourrez vous reconnecter avec votre nouveau mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[color:var(--color-text-muted)] mb-1">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-text-subtle)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-xl pl-10 pr-12 py-3 text-[color:var(--color-text)] placeholder-[color:var(--color-text-subtle)] focus:outline-none focus:border-[color:var(--color-primary)] transition-colors"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text-muted)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[color:var(--color-text-muted)] mb-1">Confirmer le nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-text-subtle)]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-xl pl-10 pr-12 py-3 text-[color:var(--color-text)] placeholder-[color:var(--color-text-subtle)] focus:outline-none focus:border-[color:var(--color-primary)] transition-colors"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text-muted)]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <ul className="space-y-1 text-xs">
                <li className={hasMinPasswordLength ? 'text-green-400' : 'text-[color:var(--color-text-subtle)]'}>• 8 caractères minimum</li>
                <li className={hasLetter ? 'text-green-400' : 'text-[color:var(--color-text-subtle)]'}>• Au moins une lettre</li>
                <li className={hasNumber ? 'text-green-400' : 'text-[color:var(--color-text-subtle)]'}>• Au moins un chiffre</li>
              </ul>

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
                disabled={isLoading || isAuthLoading || !session}
                className="w-full bg-[color:var(--color-primary)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[color:var(--color-text)] font-semibold py-3 rounded-xl transition-colors"
              >
                {isLoading ? 'Mise à jour…' : 'Mettre à jour mon mot de passe'}
              </button>
            </form>

            <p className="text-center text-[color:var(--color-text-subtle)] text-sm mt-6">
              <Link to="/mot-de-passe-oublie" className="text-[color:var(--color-primary)] hover:underline">
                Demander un nouveau lien
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
