import { describe, expect, it } from 'vitest';
import { buildKnowledgeImportRows, splitTextIntoKnowledgeChunks } from '../pdfKnowledge';

describe('splitTextIntoKnowledgeChunks', () => {
  it('returns an empty array when the input is blank', () => {
    expect(splitTextIntoKnowledgeChunks('   ')).toEqual([]);
  });

  it('keeps a short text in a single chunk', () => {
    expect(splitTextIntoKnowledgeChunks('Notice compacte', 100)).toEqual(['Notice compacte']);
  });

  it('splits long paragraphs with overlap', () => {
    const text = 'A'.repeat(2200);
    const chunks = splitTextIntoKnowledgeChunks(text, 1000, 200);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1].startsWith('A'.repeat(100))).toBe(true);
  });
});

describe('buildKnowledgeImportRows', () => {
  it('adds a part suffix when several chunks are generated', () => {
    const rows = buildKnowledgeImportRows({
      title: 'Notice Sega Rally',
      category: 'manuals',
      text: ['Bloc 1', 'Bloc 2', 'Bloc 3'].join('\n\n'),
      maxChars: 8,
      overlapChars: 0,
    });

    expect(rows).toEqual([
      { title: 'Notice Sega Rally — Partie 1/3', category: 'manuals', content: 'Bloc 1' },
      { title: 'Notice Sega Rally — Partie 2/3', category: 'manuals', content: 'Bloc 2' },
      { title: 'Notice Sega Rally — Partie 3/3', category: 'manuals', content: 'Bloc 3' },
    ]);
  });
});
