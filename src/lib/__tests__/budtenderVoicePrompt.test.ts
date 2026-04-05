import { describe, it, expect } from 'vitest';
import { getVoicePrompt } from '../budtenderPrompts';

describe('getVoicePrompt — skills vocaux', () => {
  it('inclut le noyau skills et la consigne load_voice_skill, sans le corps des skills optionnels', () => {
    const prompt = getVoicePrompt([], {}, undefined, [], [], 0, 0, []);

    expect(prompt).toContain('SKILLS — NOYAU');
    expect(prompt).toContain('CHARGEMENT À LA DEMANDE');
    expect(prompt).toContain('load_voice_skill');
    expect(prompt).toContain('search_catalog');

    expect(prompt).not.toContain('Myrcène : détente');
    expect(prompt).not.toContain('Fleurs → Accessoires');
    expect(prompt).not.toContain("effet d'entourage (synergie");
  });
});
