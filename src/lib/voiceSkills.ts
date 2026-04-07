/**
 * Skills vocaux : noyau toujours dans le system instruction,
 * skills optionnels chargés via load_voice_skill (lazy Vite + hook).
 */

export const OPTIONAL_VOICE_SKILL_IDS = ['botanique_expert', 'cross_selling', 'fidelite'] as const;
export type OptionalVoiceSkillId = (typeof OPTIONAL_VOICE_SKILL_IDS)[number];

const OPTIONAL_VOICE_SKILL_SET = new Set<string>(OPTIONAL_VOICE_SKILL_IDS);

/** Minification voix : supprime le markdown que le TTS lirait mot à mot */
export function minifySkillMarkdown(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/`([^`\n]+?)`/g, '$1')
    .replace(/^>\s.*/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const coreVoiceSkillFiles = import.meta.glob(
  ['../skills/skill.md', '../skills/vocal_actions.md'],
  { query: '?raw', eager: true, import: 'default' }
) as Record<string, string>;

const optionalVoiceSkillLoaders = import.meta.glob(
  ['../skills/botanique_expert.md', '../skills/cross_selling.md', '../skills/fidelite.md'],
  { query: '?raw', eager: false, import: 'default' }
) as Record<string, () => Promise<string>>;

function appendSkillBlock(context: string, skillKey: string, raw: string): string {
  const content = minifySkillMarkdown(raw);
  return `${context}### ${skillKey.toUpperCase()}\n${content}\n\n`;
}

/** Contenu injecté dans getVoicePrompt : skill.md puis vocal_actions.md uniquement */
export function buildCoreVoiceSkillsContext(): string {
  const paths = Object.keys(coreVoiceSkillFiles).sort((a, b) => {
    const fa = a.split('/').pop() || '';
    const fb = b.split('/').pop() || '';
    if (fa === 'skill.md') return -1;
    if (fb === 'skill.md') return 1;
    return fa.localeCompare(fb);
  });

  let context =
    '## COMPÉTENCES SPÉCIALISÉES (SKILLS — NOYAU)\nTu possèdes les instructions suivantes, toujours actives :\n\n';

  for (const path of paths) {
    const fileName = path.split('/').pop() || '';
    const skillKey = fileName.replace('.md', '');
    const raw = coreVoiceSkillFiles[path] as string;
    context = appendSkillBlock(context, skillKey, raw);
  }

  return context;
}

export function buildOptionalVoiceSkillsInstruction(): string {
  return `## SKILLS ÉTENDUS (CHARGEMENT À LA DEMANDE)
Ces instructions détaillées ne sont PAS dans ton prompt initial. Tu DOIS impérativement charger le skill correspondant avant de répondre précisément à ces sujets :
- Expertise botanique (terpènes, cannabinoïdes, variétés, spectre complet) → appelle load_voice_skill avec skill_id "botanique_expert"
- Stratégie cross-sell avancée (recommandations complexes) → appelle load_voice_skill avec skill_id "cross_selling"
- Informations sur le programme de fidélité, les points, les paliers, les récompenses ou le parrainage → appelle systématiquement load_voice_skill avec skill_id "fidelite" avant de répondre.
Après réception du contenu du skill, utilise ces règles pour guider ta réponse.`;
}

export function isOptionalVoiceSkillId(id: string): id is OptionalVoiceSkillId {
  return OPTIONAL_VOICE_SKILL_SET.has(id);
}

export type LoadOptionalVoiceSkillResult =
  | { ok: true; skill_id: string; content: string }
  | { ok: false; error: string };

export async function loadOptionalVoiceSkill(skillId: string): Promise<LoadOptionalVoiceSkillResult> {
  if (!isOptionalVoiceSkillId(skillId)) {
    return {
      ok: false as const,
      error: `skill_id inconnu. Valeurs autorisées : ${OPTIONAL_VOICE_SKILL_IDS.join(', ')}`,
    };
  }

  const fileName = `${skillId}.md`;
  const path = Object.keys(optionalVoiceSkillLoaders).find((p) => p.endsWith(`/${fileName}`));
  if (!path || !optionalVoiceSkillLoaders[path]) {
    return { ok: false as const, error: `Fichier skill introuvable pour "${skillId}".` };
  }

  try {
    const raw = await optionalVoiceSkillLoaders[path]();
    const content = minifySkillMarkdown(typeof raw === 'string' ? raw : String(raw));
    return { ok: true as const, skill_id: skillId, content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, error: `Chargement du skill impossible : ${msg}` };
  }
}
