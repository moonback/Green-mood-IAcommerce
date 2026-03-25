import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useSettingsStore } from '../store/settingsStore';
import { Lock, CreditCard } from 'lucide-react';

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}

function PaymentForm({ amount, onSuccess, onError }: Omit<StripePaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Paiement refusé. Veuillez réessayer.');
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        onError('Statut de paiement inattendu. Veuillez contacter le support.');
      }
    } catch (err) {
      onError('Une erreur est survenue lors du paiement.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        <span>Paiement 100% sécurisé — chiffrement SSL 256 bits via Stripe</span>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex items-center justify-center gap-3 py-4 px-8 bg-emerald-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Traitement en cours…
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Confirmer le paiement — {amount.toFixed(2)} €
          </>
        )}
      </button>
    </form>
  );
}

export default function StripePaymentForm({ clientSecret, amount, onSuccess, onError }: StripePaymentFormProps) {
  const { settings } = useSettingsStore();

  const publicKey = (settings as any).stripe_public_key || import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
  if (!publicKey) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
        Clé publique Stripe non configurée. Vérifiez les paramètres admin.
      </div>
    );
  }

  const stripePromise = loadStripe(publicKey);

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#a36cbe',
      colorBackground: '#09090b',
      colorText: '#ffffff',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
    rules: {
      '.Input': {
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#ffffff',
      },
      '.Input:focus': {
        border: '1px solid rgba(16,185,129,0.5)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        boxShadow: 'none',
      },
      '.Label': {
        color: '#71717a',
        fontSize: '10px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      },
      '.Tab': {
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#a1a1aa',
      },
      '.Tab--selected': {
        backgroundColor: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.3)',
        color: '#a36cbe',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <PaymentForm amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
