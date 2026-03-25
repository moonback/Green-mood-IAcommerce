import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, Sparkles, Star, ChevronRight, X, Zap } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

const LS_KEY = 'neurocart_onboarding_done';

const SLIDES = [
  {
    Icon: Zap,
    badge: 'Bienvenue',
    title: 'Cortex Experience',
    subtitle: 'L\'innovation au bout des doigts',
    description:
      'Explorez une sélection ultra-premium d\'équipements tech et lifestyle, curés par nos algorithmes pour l\'excellence.',
  },
  {
    Icon: Truck,
    badge: 'Logistique',
    title: 'Flux Instantané',
    subtitle: 'Expédition Express 24/48h',
    description:
      'Une chaîne logistique optimisée pour que vos nouvelles technologies arrivent chez vous sans attente inutile.',
  },
  {
    Icon: Sparkles,
    badge: 'Intelligence',
    title: 'Conseiller Neural',
    subtitle: 'Cortex IA à votre service',
    description:
      'Notre moteur d\'IA analyse vos besoins en temps réel pour vous guider vers le "perfect match" technologique.',
  },
  {
    Icon: Star,
    badge: 'Ecosystème',
    title: 'Neural Rewards',
    subtitle: 'Le privilège de l\'innovation',
    description:
      'Gagnez des points à chaque interaction et accédez à des paliers VIP exclusifs réservés à l\'avant-garde.',
  },
  {
    Icon: ShieldCheck,
    badge: 'Sérénité',
    title: 'Qualité Probante',
    subtitle: 'Certification & Garantie Totale',
    description:
      'Chaque composant de notre catalogue est soumis à un protocole de test rigoureux. Sécurité et satisfaction sans compromis.',
    isFinal: true,
  },
] as const;

export default function OnboardingOverlay() {
  const { settings } = useSettingsStore();
  const navigate = useNavigate();

  const [done, setDone] = useState(() => !!localStorage.getItem(LS_KEY));
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Capture at mount whether splash will run (so we can delay behind it)
  const waitForSplash = useRef(
    settings.splash_enabled && !localStorage.getItem('hasSeenSplash'),
  );

  useEffect(() => {
    if (done) return;
    const delay = waitForSplash.current ? 5600 : 400;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [done]);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      finish(true);
    }
  };

  const finish = (redirect: boolean) => {
    localStorage.setItem(LS_KEY, 'true');
    setDone(true);
    if (redirect) navigate('/catalogue');
  };

  if (done || !visible) return null;

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;
  const SlideIcon = slide.Icon;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[9990] flex flex-col items-center justify-center px-4 bg-[color:var(--color-overlay)] backdrop-blur-md"
      >
        {/* Skip button */}
        {!isLast && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => finish(false)}
            className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Passer
          </motion.button>
        )}

        {/* Slide card */}
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 48, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -48, scale: 0.97 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-3xl p-8 text-center shadow-2xl"
            >
              {/* Icon circle */}
              <div className="flex justify-center mb-5">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
                  className="w-20 h-20 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center"
                >
                  <SlideIcon className="w-10 h-10 text-[color:var(--color-primary)]" />
                </motion.div>
              </div>

              {/* Badge */}
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="inline-block px-3 py-1 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] text-[11px] font-black uppercase tracking-widest mb-4"
              >
                {slide.badge}
              </motion.span>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-black text-[color:var(--color-text)] mb-1"
              >
                {slide.title}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm font-semibold text-[color:var(--color-primary)] mb-4"
              >
                {slide.subtitle}
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-[color:var(--color-text-muted)] leading-relaxed mb-8"
              >
                {slide.description}
              </motion.p>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                onClick={handleNext}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {isLast ? 'Explorer le catalogue' : 'Suivant'}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {SLIDES.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setCurrentSlide(i)}
                animate={{
                  width: i === currentSlide ? 24 : 8,
                  opacity: i <= currentSlide ? 1 : 0.35,
                }}
                transition={{ duration: 0.25 }}
                className="h-2 rounded-full bg-[color:var(--color-primary)]"
                style={{ width: i === currentSlide ? 24 : 8 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
