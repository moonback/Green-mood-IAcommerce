/**
 * Skills vocaux : noyau toujours dans le system instruction.
 * Les skills optionnels ont été migrés vers la base de connaissances (RAG).
 */

/** Minification voix : supprime le markdown que le TTS lirait mot à mot */
export function minifySkillMarkdown(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/`([^`\n]+?)`/g, '$1')
    .replace(/^>\s.*/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}]/gu, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const coreVoiceSkillFiles = import.meta.glob(
  ['../skills/skill.md', '../skills/vocal_actions.md'],
  { query: '?raw', eager: true, import: 'default' }
) as Record<string, string>;

function appendSkillBlock(context: string, skillKey: string, raw: string): string {
  const content = minifySkillMarkdown(raw);
  return `${context}### ${skillKey.toUpperCase()}\n${content}\n\n`;
}

let _coreVoiceSkillsCache: string | null = null;

/** Contenu injecté dans getVoicePrompt : skill.md puis vocal_actions.md uniquement */
export function buildCoreVoiceSkillsContext(): string {
  if (_coreVoiceSkillsCache) return _coreVoiceSkillsCache;
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

  _coreVoiceSkillsCache = context;
  return context;
}
