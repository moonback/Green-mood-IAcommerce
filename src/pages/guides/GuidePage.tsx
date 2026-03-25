import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SEO from '../../components/SEO';
import { articleSchema, breadcrumbSchema, faqSchema, howToSchema } from '../../lib/seo/schemaBuilder';
import { useSettingsStore } from '../../store/settingsStore';
import { supabase } from '../../lib/supabase';
import { slugify } from '../../lib/utils';
import { generatedGuides } from './generatedGuides';

export const guideContent = {
  'guide-choisir-innovation-tech': {
    title: 'Comment choisir son innovation High-Tech',
    description: 'Guide complet pour sélectionner le produit technologique idéal selon vos besoins et votre budget.',
    summary: 'Guide expert pour choisir des produits innovants adaptés : usage, performance, budget et connectivité.',
    body: "Le choix d'un produit high-tech dépend de plusieurs critères essentiels : l'usage quotidien, la performance technique, l'autonomie et la compatibilité avec votre écosystème existant. Privilégiez les marques reconnues pour leur durabilité et leur support logiciel. NeuroCart propose des produits certifiés CE avec une garantie constructeur de 2 ans et un support technique expert.",
    faq: [
      { question: 'Comment vérifier la compatibilité ?', answer: 'Nos fiches produits détaillent les protocoles supportés (Bluetooth, Wi-Fi, Matter). En cas de doute, notre IA PlayAdvisor peut analyser votre configuration actuelle.' },
      { question: 'Les produits sont-ils évolutifs ?', answer: 'Nous sélectionnons des équipements recevant des mises à jour régulières pour garantir une longévité maximale et de nouvelles fonctionnalités au fil du temps.' },
    ],
  },
  'guide-maison-connectee': {
    title: 'Optimiser sa maison connectée',
    description: "Tout savoir sur la domotique et les objets connectés : sécurité, confort et économies d'énergie.",
    summary: 'Comment choisir et installer ses objets connectés pour une maison intelligente et sécurisée.',
    body: "La maison connectée n'est plus un luxe mais un confort accessible. Des ampoules intelligentes aux caméras de sécurité 4K, chaque objet doit s'intégrer parfaitement. Pour une installation stable, privilégiez un hub central compatible avec les standards ouverts. Un réseau Wi-Fi robuste est la fondation indispensable de votre smart home. NeuroCart vous accompagne dans le choix des solutions les plus fiables du marché.",
    faq: [
      { question: 'Est-ce difficile à installer ?', answer: 'La plupart de nos produits sont "Plug & Play". Nos guides vidéos et notre support client vous aident pour les configurations plus complexes.' },
      { question: 'Mes données sont-elles sécurisées ?', answer: 'Nous ne référençons que des marques respectant les normes RGPD et proposant un chiffrement de bout en bout pour votre vie privée.' },
    ],
  },
  'guide-gadgets-utiles-quotidien': {
    title: 'Top des gadgets utiles pour le quotidien',
    description: 'Découvrez les innovations qui facilitent vraiment la vie de tous les jours, pour tous les budgets.',
    summary: "Sélection d'objets innovants et pratiques : productivité, bien-être et gain de temps.",
    body: "L'innovation high-tech se niche souvent dans les petits objets. Batteries externes ultra-rapides, purificateurs d'air nomades ou accessoires de bureau ergonomiques — ces gadgets transforment votre routine. Chez NeuroCart, nous testons chaque produit pour valider son utilité réelle avant de le proposer. Qualité de fabrication et ergonomie sont nos priorités absolues.",
    faq: [
      { question: 'Sont-ils de bonnes idées cadeaux ?', answer: 'Absolument. Nos gadgets sont livrés dans des packagings premium, parfaits pour offrir une touche d\'innovation à vos proches.' },
      { question: 'Proposez-vous des prix pour les entreprises ?', answer: 'Oui, nous avons des solutions pour les cadeaux d\'affaires et l\'équipement de bureau innovant avec des tarifs dégressifs.' },
    ],
  },
  'guide-audio-haute-fidelite': {
    title: "S'équiper en audio haute-fidélité",
    description: 'Guide pour choisir son casque, ses écouteurs ou ses enceintes connectées premium.',
    summary: 'Audio high-tech : codecs, réduction de bruit, spatialisation et confort d\'écoute.',
    body: "Le son est une science de précision. Pour une immersion totale, choisissez des équipements supportant les codecs haute résolution (LDAC, aptX Adaptive). La réduction de bruit active (ANC) est devenue un standard pour les nomades. Pour votre salon, les enceintes multi-room permettent de diffuser votre musique partout en un clic. NeuroCart sélectionne le meilleur de l'innovation acoustique mondiale.",
    faq: [
      { question: 'Quelle est l\'importance des codecs ?', answer: 'Ils déterminent la qualité de compression du son. Un codec haute fidélité préserve les détails originaux de vos morceaux préférés.' },
      { question: 'La réduction de bruit est-elle réglable ?', answer: 'La plupart de nos modèles premium proposent plusieurs niveaux de transparence pour rester conscient de votre environnement.' },
    ],
  },
  'guide-entretien-tech': {
    title: 'Prendre soin de ses équipements tech',
    description: 'Conseils pratiques pour prolonger la durée de vie de vos smartphones, laptops et objets connectés.',
    summary: 'Maintenance préventive : batteries, nettoyage, mises à jour et stockage.',
    body: "La durabilité commence par un bon entretien. Évitez les températures extrêmes pour vos batteries lithium-ion et maintenez vos ports de charge propres. Les mises à jour logicielles sont cruciales, non seulement pour les fonctionnalités, mais surtout pour la sécurité. NeuroCart s'engage pour une technologie durable en proposant des guides complets et des accessoires de protection de haute qualité.",
    faq: [
      { question: 'Comment optimiser ma batterie ?', answer: 'Évitez les décharges complètes et privilégiez des cycles de charge entre 20% et 80% pour maximiser la longévité de vos accumulateurs.' },
      { question: 'Que faire en cas de panne hors garantie ?', answer: 'Notre SAV peut vous orienter vers des centres de réparation partenaires ou vous proposer des pièces de remplacement certifiées.' },
    ],
  },
};

export const allGuideContent = {
  ...guideContent,
  ...generatedGuides,
} as const;

type GuideEntry = {
  title: string;
  description: string;
  summary: string;
  body: string;
  faq: Array<{ question: string; answer: string }>;
};

export type GuideSlug = keyof typeof allGuideContent | string;

function mapBlogRowToGuideEntry(row: any): GuideEntry {
  const content = String(row.content || '');
  const excerpt = String(row.excerpt || '').trim();

  return {
    title: String(row.title || 'Article'),
    description: excerpt || content.slice(0, 155) || 'Article de blog',
    summary: excerpt || content.slice(0, 240) || 'Article de blog',
    body: content,
    faq: [],
  };
}

export default function GuidePage({ slug }: { slug?: GuideSlug }) {
  const { slug: slugFromParams } = useParams();
  const { settings } = useSettingsStore();
  const resolvedSlug = String(slug ?? slugFromParams ?? '');
  const staticContent = allGuideContent[resolvedSlug as keyof typeof allGuideContent] as GuideEntry | undefined;
  const [dbContent, setDbContent] = useState<GuideEntry | null>(null);
  const [isLoadingDbContent, setIsLoadingDbContent] = useState(false);

  useEffect(() => {
    if (staticContent || !resolvedSlug) return;

    let isCancelled = false;

    const loadFromDatabase = async () => {
      setIsLoadingDbContent(true);

      const { data: blogRows } = await supabase
        .from('blog_posts')
        .select('title, slug, excerpt, content, is_published')
        .eq('slug', resolvedSlug)
        .eq('is_published', true)
        .limit(1);

      if (!isCancelled && blogRows && blogRows.length > 0) {
        setDbContent(mapBlogRowToGuideEntry(blogRows[0]));
        setIsLoadingDbContent(false);
        return;
      }

      const { data: kbRows } = await supabase
        .from('knowledge_base')
        .select('title, content, category')
        .eq('category', 'blog');

      if (isCancelled) return;

      const matchedKbRow = (kbRows || []).find((row: any) => slugify(String(row.title || '')) === resolvedSlug);
      setDbContent(matchedKbRow ? mapBlogRowToGuideEntry(matchedKbRow) : null);
      setIsLoadingDbContent(false);
    };

    loadFromDatabase();

    return () => {
      isCancelled = true;
    };
  }, [resolvedSlug, staticContent]);

  const content = staticContent || dbContent;

  if (isLoadingDbContent && !content) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 pt-28 pb-20">
        <section className="max-w-4xl mx-auto px-4">
          <p className="text-zinc-400">Chargement de l'article...</p>
        </section>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 pt-28 pb-20">
        <section className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold">Guide introuvable</h1>
          <p className="text-zinc-400 mt-3">Cet article n'existe pas ou n'est plus publié.</p>
          <Link className="text-green-400 underline mt-5 inline-block" to="/guides">Retour aux guides</Link>
        </section>
      </main>
    );
  }
  const schema = [
    articleSchema({ title: content.title, description: content.description, path: `/guides/${resolvedSlug}`, datePublished: '2026-01-01' }),
    ...(content.faq.length > 0 ? [faqSchema(content.faq)] : []),
    breadcrumbSchema([
      { name: 'Accueil', path: '/' },
      { name: 'Guides Loisirs', path: '/guides' },
      { name: content.title, path: `/guides/${resolvedSlug}` },
    ]),
    howToSchema({
      name: `Comment utiliser ${content.title}`,
      description: content.description,
      steps: ['Définir votre espace et budget', 'Choisir la catégorie de machine adaptée', 'Contacter ESIL Ventes pour un devis personnalisé'],
    }),
  ];

  const body = content.body.replace(/ESIL Ventes/g, settings.store_name);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pt-28 pb-20">
      <SEO
        title={`${content.title} | ${settings.store_name}`}
        description={content.description}
        canonical={`/guides/${resolvedSlug}`}
        schema={schema}
        article={{ publishedTime: '2026-01-01', section: 'Guides Loisirs' }}
        keywords={['arcade', 'guide loisirs', settings.store_name.toLowerCase(), 'machines de loisirs', 'flipper', ...content.faq.map((f) => f.question)]}
        semanticKeywords={['arcade', 'flipper', 'simulateur', 'jeux automatiques', 'loisirs']}
        aiSummary={content.summary}
        aiEntity="Arcade;Flipper;Simulateur;Jeux automatiques;Loisirs récréatifs"
      />
      <section className="max-w-4xl mx-auto px-4 space-y-6">
        <p className="text-sm uppercase tracking-widest text-green-400">AI Summary</p>
        <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">{content.summary}</p>
        <h1 className="text-4xl font-bold">{content.title}</h1>
        <p className="text-zinc-300 leading-7">{body}</p>

        {content.faq.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Questions fréquentes</h2>
            {content.faq.map((item) => (
              <article key={item.question} className="rounded-lg border border-zinc-800 p-4">
                <h3 className="font-medium">{item.question}</h3>
                <p className="text-zinc-300">{item.answer}</p>
              </article>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800">
          <h2 className="text-xl font-semibold mb-3">Liens internes recommandés</h2>
          <div className="flex flex-wrap gap-3">
            <Link className="text-green-400 underline" to="/catalogue">Voir les machines de loisirs</Link>
            <Link className="text-green-400 underline" to="/boutique">Explorer la boutique</Link>
            <Link className="text-green-400 underline" to="/contact">Parler à un expert</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
