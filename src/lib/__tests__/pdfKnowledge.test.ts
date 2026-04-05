import { describe, expect, it } from 'vitest';
import { 
  buildKnowledgeImportRows, 
  splitTextIntoKnowledgeChunks, 
  extractPdfTextFromArrayBuffer,
  extractPdfTextFromFile
} from '../pdfKnowledge';

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

describe('extractPdfTextFromArrayBuffer', () => {
  it('extracts literal strings from BT/ET blocks', async () => {
    const pdf = `
      %PDF-1.4
      stream
      BT
      (Hello) Tj
      ( World) Tj
      ET
      endstream
    `;
    const buffer = new TextEncoder().encode(pdf).buffer;
    const result = await extractPdfTextFromArrayBuffer(buffer);
    expect(result).toBe('Hello\n World');
  });

  it('extracts hex strings from BT/ET blocks', async () => {
    const pdf = `
      stream
      BT
      <48656c6c6f> Tj
      ET
      endstream
    `;
    const buffer = new TextEncoder().encode(pdf).buffer;
    const result = await extractPdfTextFromArrayBuffer(buffer);
    expect(result).toBe('Hello');
  });

  it('extracts from TJ array blocks', async () => {
    const pdf = `
      stream
      BT
      [(Hi) 123 ( There)] TJ
      ET
      endstream
    `;
    const buffer = new TextEncoder().encode(pdf).buffer;
    const result = await extractPdfTextFromArrayBuffer(buffer);
    expect(result).toBe('Hi There');
  });

  it('handles multiple streams and normalizes whitespace', async () => {
    const pdf = `
      stream
      BT
      (Page 1) Tj
      ET
      endstream
      
      stream
      BT
      (Page 2) Tj
      ET
      endstream
    `;
    const buffer = new TextEncoder().encode(pdf).buffer;
    const result = await extractPdfTextFromArrayBuffer(buffer);
    expect(result).toContain('Page 1');
    expect(result).toContain('Page 2');
  });

  it('handles literal escape sequences', async () => {
    const pdf = `
      stream
      BT
      (Line\\nBreak and \\(Parens\\)) Tj
      ET
      endstream
    `;
    const buffer = new TextEncoder().encode(pdf).buffer;
    const result = await extractPdfTextFromArrayBuffer(buffer);
    expect(result).toBe('Line\nBreak and (Parens)');
  });

  it('handles octal escape sequences', async () => {
    const pdf = `
      stream
      BT
      (\\110\\145\\154\\154\\157) Tj
      ET
      endstream
    `;
    const buffer = new TextEncoder().encode(pdf).buffer;
    const result = await extractPdfTextFromArrayBuffer(buffer);
    expect(result).toBe('Hello');
  });
});

describe('extractPdfTextFromFile', () => {
  it('reads a File and extracts text', async () => {
    const pdf = 'stream BT (File Content) Tj ET endstream';
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const file = new File([blob], 'test.pdf');
    
    if (!file.arrayBuffer) {
        file.arrayBuffer = async () => new TextEncoder().encode(pdf).buffer;
    }

    const result = await extractPdfTextFromFile(file);
    expect(result).toBe('File Content');
  });
});
