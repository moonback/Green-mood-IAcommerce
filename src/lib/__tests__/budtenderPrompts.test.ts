import { describe, it, expect } from 'vitest';
import { 
  getQuizPrompt, 
  getDynamicQuizPrompt, 
  getVoicePrompt, 
  getBirthdayGiftPrompt 
} from '../budtenderPrompts';

describe('getQuizPrompt', () => {
  const quizSteps = [
    { id: 'need', question: 'Quel est ton besoin ?', options: [{ value: 'sleep', label: 'Sommeil', emoji: '😴' }] }
  ];
  const catalog = 'Produit A: 10€\nProduit B: 20€';

  it('generates a complete prompt with answers and context', () => {
    const prompt = getQuizPrompt(
      { need: 'sleep' },
      quizSteps,
      catalog,
      'Près de Paris',
      'Fais vite',
      'Melina',
      'Green Mood'
    );

    expect(prompt).toContain('Melina');
    expect(prompt).toContain('Green Mood');
    expect(prompt).toContain('Quel est ton besoin ? : Sommeil'); // From quizSteps map
    expect(prompt).toContain('Près de Paris');
    expect(prompt).toContain('Fais vite');
    expect(prompt).toContain(catalog);
  });

  it('handles missing answers and no context', () => {
    const prompt = getQuizPrompt({}, [], catalog);
    expect(prompt).toContain('Aucune réponse fournie.');
    expect(prompt).not.toContain('Contexte client additionnel');
  });
});

describe('getDynamicQuizPrompt', () => {
  const catalog = 'Resume catalog...';

  it('generates prompt with history and custom instructions', () => {
    const prompt = getDynamicQuizPrompt(
      [{ role: 'user', content: 'Je cherche du calme' }],
      catalog,
      undefined,
      'Sois poli'
    );

    expect(prompt).toContain('USER : Je cherche du calme');
    expect(prompt).toContain('Sois poli');
    expect(prompt).toContain(catalog);
    expect(prompt).toContain('status": "question"'); // JSON examples
  });

  it('handles empty history and includes context if provided', () => {
    const prompt = getDynamicQuizPrompt([], catalog, 'Prefere les huiles');
    expect(prompt).toContain('Prefere les huiles');
    expect(prompt).not.toContain('USER :');
  });
});

describe('getVoicePrompt (Gemini Live)', () => {
  const products = [{ id: '1', name: 'Huile CBD', price: 30, category: { name: 'Huiles' } }] as any;

  it('builds identity and voice format rules', () => {
    const prompt = getVoicePrompt([], {});
    expect(prompt).toContain('## RÔLE ET POSTURE');
    expect(prompt).toContain('## RÈGLES FORMAT AUDIO');
    expect(prompt).toContain('INTERDIT ABSOLU');
  });

  it('includes client loyalty and tier information', () => {
    const tiers = [
        { min_points: 0, name: 'Bronze', multiplier: 1 },
        { min_points: 1000, name: 'Silver', multiplier: 1.5 }
    ];
    // User with 500 points (Bronze, 500 more for Silver)
    const prompt = getVoicePrompt([], {}, 'Ahmed', [], [], 0, 0, [], undefined, 500, 'Melina', tiers, true, [], 'Shop', 'Carats');

    expect(prompt).toContain('Ahmed');
    expect(prompt).toContain('500 Carats — palier Bronze');
    expect(prompt).toContain('encore 500 Carats pour atteindre le palier Silver');
  });

  it('handles empty loyalty and lists full tiers program', () => {
    const tiers = [{ min_points: 0, name: 'Bronze', multiplier: 1 }];
    const prompt = getVoicePrompt([], {}, null, [], [], 0, 0, [], undefined, undefined, 'Bot', tiers, true, [], 'Shop', 'Points');
    expect(prompt).toContain('PROGRAMME FIDÉLITÉ : Bronze (≥0 Points, ×1)');
  });

  it('includes past orders and recently viewed products', () => {
    const orders = [
      { id: 'ord-123', date: '2026-04-01', status: 'shipped', total: 45.5, items: [{ quantity: 1, product_name: 'Fleur G' }] }
    ];
    const viewed = [{ name: 'Resine X' }];
    const prompt = getVoicePrompt([], {}, 'Mayss', [], orders, 0, 0, [], undefined, 0, 'Melina', [], true, viewed);

    expect(prompt).toContain('ord-123');
    expect(prompt).toContain('1x Fleur G');
    expect(prompt).toContain('NAVIGATION RÉCENTE : Resine X');
  });

  it('calculates cart total and delivery fee rules', () => {
    const cart = [
        { product: { name: 'Prod A', price: 20 }, quantity: 2 } // Total 40
    ];
    // Seuil 50, fee 5 -> not reached
    const promptNotReached = getVoicePrompt([], {}, null, [], [], 5.90, 50, cart);
    expect(promptNotReached).toContain('[PANIER RÉEL] : Prod A ×2 — total 40.00€');
    expect(promptNotReached).toContain('LIVRAISON : 5.9€. Encore 10.00€ pour la livraison gratuite.');

    // Seuil 30, fee 5 -> reached
    const promptReached = getVoicePrompt([], {}, null, [], [], 5.90, 30, cart);
    expect(promptReached).toContain('LIVRAISON : Offerte !');
  });

  it('handles empty cart with delivery rules and threshold', () => {
    const prompt = getVoicePrompt([], {}, null, [], [], 5, 50, []);
    expect(prompt).toContain('[PANIER RÉEL] : Vide.');
    expect(prompt).toContain('LIVRAISON : 5€ standard. Offerte dès 50€ d\'achat.');
  });

  it('formats catalog items without categories', () => {
    const prodNoCat = [{ name: 'Mystère', price: 99 }] as any;
    const prompt = getVoicePrompt(prodNoCat, {});
    expect(prompt).toContain('Mystère — 99€');
    expect(prompt).not.toContain('(undefined)');
  });

  it('injects full active product context for the product at screen', () => {
    const active = {
        name: 'Super MoonRock',
        shortDescription: 'Un délice',
        machineSpecs: [{ name: 'Effect', description: 'Strong' }],
        machineMetrics: { potency: 9, flavor: 8 },
        reviews: [{ comment: 'Cool', rating: 5, author: 'Bob' }],
        relatedProducts: [{ name: 'Prod B', price: 15 }]
    } as any;

    const prompt = getVoicePrompt([], {}, null, [], [], 0, 0, [], undefined, undefined, 'Melina', [], true, [], 'Shop', 'Points', active);
    
    expect(prompt).toContain("PRODUIT ACTUELLEMENT À L'ÉCRAN : Super MoonRock");
    expect(prompt).toContain('Effect: Strong');
    expect(prompt).toContain('potency: 9/10');
    expect(prompt).toContain('"Cool" (5/5 par Bob)');
    expect(prompt).toContain('Prod B (15€)');
  });

  it('applies custom formatting and optional end session rule', () => {
      const promptNoClose = getVoicePrompt([], {}, null, [], [], 0, 0, [], "SURPRISE!", undefined, 'Bot', [], false);
      expect(promptNoClose).toContain('SURPRISE!');
      expect(promptNoClose).not.toContain('FIN DE SESSION');

      const promptClose = getVoicePrompt([], {}, null, [], [], 0, 0, [], undefined, undefined, 'Bot', [], true);
      expect(promptClose).toContain('## FIN DE SESSION');
  });
});

describe('getBirthdayGiftPrompt', () => {
  const products = [
    { id: 'uuid-1', name: 'Vapo Z', description: 'Top', category: { name: 'Vapes' } }
  ] as any;
  const prefs = { favorite_flavor: 'Fraise' };

  it('uses order history for recommendations if available', () => {
    const orders = [
      { items: [{ product_name: 'Huile X' }] }
    ];
    const prompt = getBirthdayGiftPrompt(products, prefs, [], orders);
    expect(prompt).toContain("HISTORIQUE D'ACHATS RÉEL");
    expect(prompt).toContain('Huile X');
    expect(prompt).toContain('favorite flavor : Fraise');
  });

  it('uses past products history if past orders are empty', () => {
    const productsHistory = [{ product_name: 'Fleur Cool' }];
    const prompt = getBirthdayGiftPrompt(products, prefs, productsHistory, []);
    expect(prompt).toContain('Fleur Cool');
  });

  it('uses declared preferences if history is empty', () => {
    const prompt = getBirthdayGiftPrompt(products, prefs, [], []);
    expect(prompt).toContain("Aucun historique d'achat disponible.");
    expect(prompt).toContain('favorite flavor : Fraise');
  });
});
