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
    expect(prompt).toContain('status": "question"'); // JSON examples
    expect(prompt).toContain('LOGIQUE DÉTERMINISTE'); // New pilier
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
    expect(prompt).toContain('## RÔLE :');
    expect(prompt).toContain('## RÈGLES AUDIO — OBLIGATOIRE');
  });

  it('includes client loyalty information', () => {
    const prompt = getVoicePrompt([], {}, 'Ahmed', [], [], 0, 0, [], undefined, 500, 'Melina', [], true, [], 'Shop', 'Carats');

    expect(prompt).toContain('Ahmed');
    expect(prompt).toContain('FIDÉLITÉ : 500 Carats');
  });

  it('includes past orders and recently viewed products', () => {
    const orders = [
      { id: 'ord-123', date: '2026-04-01', status: 'shipped', total: 45.5, items: [{ quantity: 1, product_name: 'Fleur G' }] }
    ];
    const viewed = [{ name: 'Resine X' }];
    const prompt = getVoicePrompt([], {}, 'Mayss', [], orders, 0, 0, [], undefined, 0, 'Melina', [], true, viewed);

    expect(prompt).toContain('HISTORIQUE : 45.5€');
    expect(prompt).toContain('NAVIGATION : Resine X');
  });

  it('calculates cart total and delivery fee rules', () => {
    const cart = [
        { product: { name: 'Prod A', price: 20 }, quantity: 2 } // Total 40
    ];
    // Seuil 50, fee 5 -> not reached
    const promptNotReached = getVoicePrompt([], {}, null, [], [], 5.90, 50, cart);
    expect(promptNotReached).toContain('[PANIER] : Prod A ×2');
    expect(promptNotReached).toContain('LIVRAISON : 5.9€. Encore 10.00€ pour le gratuit.');

    // Seuil 30, fee 5 -> reached
    const promptReached = getVoicePrompt([], {}, null, [], [], 5.90, 30, cart);
    expect(promptReached).toContain('LIVRAISON : Offerte !');
  });

  it('handles empty cart', () => {
    const prompt = getVoicePrompt([], {}, null, [], [], 5, 50, []);
    expect(prompt).toContain('[PANIER] : Vide.');
  });

  it('formats catalog items', () => {
    const prodNoCat = [{ name: 'Mystère', price: 99 }] as any;
    const prompt = getVoicePrompt(prodNoCat, {});
    expect(prompt).toContain('Mystère — 99€');
  });

  it('injects active product context', () => {
    const active = {
        name: 'Super MoonRock',
        shortDescription: 'Un délice',
        machineMetrics: { potency: 9, flavor: 8 },
        reviews: [{ comment: 'Cool', rating: 5, author: 'Bob' }]
    } as any;

    const prompt = getVoicePrompt([], {}, null, [], [], 0, 0, [], undefined, undefined, 'Bot', [], true, [], 'Shop', 'Points', active);
    
    expect(prompt).toContain("PRODUIT À L'ÉCRAN : Super MoonRock");
    expect(prompt).toContain('potency: 9/10');
    expect(prompt).toContain('"Cool"');
  });

  it('applies custom formatting and optional end session rule', () => {
      const promptNoClose = getVoicePrompt([], {}, null, [], [], 0, 0, [], "SURPRISE!", undefined, 'Bot', [], false);
      expect(promptNoClose).toContain('SURPRISE!');
      expect(promptNoClose).not.toContain('## FIN');

      const promptClose = getVoicePrompt([], {}, null, [], [], 0, 0, [], undefined, undefined, 'Bot', [], true);
      expect(promptClose).toContain('## FIN');
  });

  it('keeps voice prompt under hard limit incluso with large context', () => {
    const hugePrefs = Object.fromEntries(
      Array.from({ length: 120 }).map((_, i) => [`pref_${i}`, `value_${i}_${'x'.repeat(80)}`])
    );
    const hugeProducts = Array.from({ length: 120 }).map((_, i) => ({
      id: String(i),
      name: `Produit ${i}`,
      price: i + 1,
      description: `Description ${'d'.repeat(140)}`,
      category: { name: 'Fleurs' },
    })) as any;

    const prompt = getVoicePrompt(hugeProducts, hugePrefs, 'Client');
    expect(prompt.length).toBeLessThanOrEqual(16000);
  });
});

describe('getBirthdayGiftPrompt', () => {
  it('identifies itself and mentions anniversary', () => {
    const products = [{ id: 'uuid-1', name: 'Vapo Z' }] as any;
    const prompt = getBirthdayGiftPrompt(products, {}, [], []);
    expect(prompt).toContain('Anniversaire client');
  });
});
