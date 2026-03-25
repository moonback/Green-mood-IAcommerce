import { motion, useMotionValue, useSpring } from "motion/react";
import SEO from "../components/SEO";
import { useSettingsStore } from "../store/settingsStore";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

export default function Legal() {
  const { settings } = useSettingsStore();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] pt-20">
      <SEO
        title={`Mentions Légales - ${settings.store_name}`}
        description={`Consultez les mentions légales, conditions générales d'utilisation et avertissements légaux de ${settings.store_name}.`}
        keywords={`mentions légales machines loisirs, CGU ${settings.store_name}`}
      />
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center pt-32 pb-20 overflow-hidden">
        {/* Grain texture */}
        <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Mouse-follow glow */}
        <motion.div
          style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
          className="absolute z-0 w-[600px] h-[600px] bg-[color:var(--color-primary)]/10 rounded-full blur-[140px] pointer-events-none opacity-20 mix-blend-screen"
        />

        {/* Ambient glows */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-72 h-72 bg-[color:var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none"
        />

        <div className="relative z-20 max-w-7xl mx-auto px-5 w-full flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full space-y-8"
          >
            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 py-2 px-5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-primary)] text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4" />
                Conformité & Légalité
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)]">
              MENTIONS <br />
              <span className="text-[color:var(--color-primary)] italic glow-green">
                LÉGALES.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              Consultez les mentions légales, conditions générales d'utilisation et avertissements de {settings.store_name}.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="prose prose-invert prose-zinc max-w-none space-y-12"
          >
            <div>
              <h2 className="text-2xl font-serif font-bold text-[color:var(--color-text)] mb-4">
                1. Éditeur du site
              </h2>
              <p className="text-[color:var(--color-text-muted)] leading-relaxed">
                Le site {settings.store_name} est édité par :<br />
                <strong>Raison sociale :</strong> {settings.store_name}
                <br />
                <strong>Siège social :</strong> {settings.store_address}
                <br />
                <strong>Numéro SIRET :</strong> {settings.store_siret || '123 456 789 00012'}
                <br />
                <strong>Directeur de la publication :</strong> [Nom du
                Directeur]
                <br />
                <strong>Contact :</strong> {settings.store_email}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-serif font-bold text-[color:var(--color-text)] mb-4">
                2. Hébergement
              </h2>
              <p className="text-[color:var(--color-text-muted)] leading-relaxed">
                Le site est hébergé par :<br />
                <strong>Nom de l'hébergeur :</strong> OVH (ou Hostinger /
                o2switch)
                <br />
                <strong>Adresse :</strong> 2 rue Kellermann, 59100 Roubaix,
                France
                <br />
                <strong>Téléphone :</strong> 1007
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-serif font-bold text-[color:var(--color-text)] mb-4">
                3. Conformité & Réglementation
              </h2>
              <p className="text-[color:var(--color-text-muted)] leading-relaxed">
                Les machines de loisirs proposées sur ce site sont strictement
                conformes à la législation européenne et française en vigueur,
                notamment la directive Machines 2006/42/CE, la directive Basse
                Tension 2014/35/UE et les normes électriques NF EN applicables.
              </p>
              <p className="text-[color:var(--color-text-muted)] leading-relaxed mt-4">
                <strong>Certification CE.</strong> Chaque machine est
                accompagnée de sa déclaration de conformité CE et de sa notice
                d'utilisation en français. {settings.store_name} agit en qualité
                d'importateur et distributeur agréé sur le territoire européen.
              </p>
              <p className="text-[color:var(--color-text-muted)] leading-relaxed mt-4">
                <strong>Usage professionnel.</strong> Pour toute exploitation
                commerciale dans un établissement recevant du public, l'exploitant
                est responsable du respect des réglementations locales applicables
                aux jeux et divertissements.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-serif font-bold text-[color:var(--color-text)] mb-4">
                4. Propriété Intellectuelle
              </h2>
              <p className="text-[color:var(--color-text-muted)] leading-relaxed">
                L'ensemble du contenu de ce site (textes, images, logos, etc.)
                est la propriété exclusive de {settings.store_name}, sauf mention
                contraire. Toute reproduction, distribution, modification,
                adaptation, retransmission ou publication de ces différents
                éléments est strictement interdite sans l'accord exprès par
                écrit de {settings.store_name}.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-serif font-bold text-[color:var(--color-text)] mb-4">
                5. Données Personnelles
              </h2>
              <p className="text-[color:var(--color-text-muted)] leading-relaxed">
                Ce site vitrine ne collecte pas de données personnelles à des
                fins commerciales. Aucun cookie de traçage publicitaire n'est
                utilisé.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
