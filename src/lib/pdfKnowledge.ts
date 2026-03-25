const STREAM_KEYWORD = 'stream';
const ENDSTREAM_KEYWORD = 'endstream';

function bytesFromLatin1String(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodePdfLiteralString(raw: string): string {
  let result = '';

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (char !== '\\') {
      result += char;
      continue;
    }

    const next = raw[i + 1];
    if (!next) break;

    if (/[0-7]/.test(next)) {
      let octal = next;
      if (/[0-7]/.test(raw[i + 2] || '')) octal += raw[i + 2];
      if (/[0-7]/.test(raw[i + 3] || '')) octal += raw[i + 3];
      result += String.fromCharCode(parseInt(octal, 8));
      i += octal.length;
      continue;
    }

    const replacements: Record<string, string> = {
      n: '\n',
      r: '\r',
      t: '\t',
      b: '\b',
      f: '\f',
      '(': '(',
      ')': ')',
      '\\': '\\',
    };

    if (next === '\n' || next === '\r') {
      if (next === '\r' && raw[i + 2] === '\n') i += 2;
      else i += 1;
      continue;
    }

    result += replacements[next] ?? next;
    i += 1;
  }

  return result;
}

function decodePdfHexString(raw: string): string {
  const normalized = raw.replace(/\s+/g, '');
  if (!normalized) return '';

  const padded = normalized.length % 2 === 1 ? `${normalized}0` : normalized;
  const bytes = new Uint8Array(padded.length / 2);

  for (let i = 0; i < padded.length; i += 2) {
    bytes[i / 2] = parseInt(padded.slice(i, i + 2), 16);
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let output = '';
    for (let i = 2; i < bytes.length; i += 2) {
      output += String.fromCharCode((bytes[i] << 8) | (bytes[i + 1] ?? 0));
    }
    return output;
  }

  return new TextDecoder('latin1').decode(bytes);
}

function extractTextObjects(streamText: string): string[] {
  const sections = streamText.match(/BT[\s\S]*?ET/g) ?? [];
  const chunks: string[] = [];

  for (const section of sections) {
    const sectionParts: string[] = [];

    const tjMatches = section.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g);
    for (const match of tjMatches) {
      const value = decodePdfLiteralString(match[1]);
      if (value.trim()) sectionParts.push(value);
    }

    const hexTjMatches = section.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g);
    for (const match of hexTjMatches) {
      const value = decodePdfHexString(match[1]);
      if (value.trim()) sectionParts.push(value);
    }

    const tjArrayMatches = section.matchAll(/\[((?:.|\n|\r)*?)\]\s*TJ/g);
    for (const match of tjArrayMatches) {
      const arrayContent = match[1];
      const partMatches = arrayContent.matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g);
      const joined: string[] = [];
      for (const part of partMatches) {
        if (part[1]) joined.push(decodePdfLiteralString(part[1]));
        else if (part[2]) joined.push(decodePdfHexString(part[2]));
      }
      const value = joined.join('');
      if (value.trim()) sectionParts.push(value);
    }

    if (sectionParts.length > 0) {
      chunks.push(sectionParts.join('\n'));
    }
  }

  return chunks;
}

async function decompressPdfStream(dict: string, rawData: Uint8Array): Promise<string | null> {
  const hasFlate = /\/FlateDecode/.test(dict);
  const hasUnsupportedFilter = /\/Filter/.test(dict) && !hasFlate;

  if (hasUnsupportedFilter) return null;

  const bytes = hasFlate
    ? await (async () => {
        if (typeof DecompressionStream === 'undefined') return null;
        const stream = new Blob([rawData]).stream().pipeThrough(new DecompressionStream('deflate'));
        const buffer = await new Response(stream).arrayBuffer();
        return new Uint8Array(buffer);
      })()
    : rawData;

  if (!bytes) return null;

  return new TextDecoder('latin1').decode(bytes);
}

export async function extractPdfTextFromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const pdfText = new TextDecoder('latin1').decode(buffer);
  const extractedSections: string[] = [];
  let position = 0;

  while (position < pdfText.length) {
    const streamIndex = pdfText.indexOf(STREAM_KEYWORD, position);
    if (streamIndex === -1) break;

    const dictStart = pdfText.lastIndexOf('<<', streamIndex);
    const dictEnd = pdfText.lastIndexOf('>>', streamIndex);
    const dict = dictStart !== -1 && dictEnd !== -1 && dictEnd > dictStart
      ? pdfText.slice(dictStart, dictEnd + 2)
      : '';

    let dataStart = streamIndex + STREAM_KEYWORD.length;
    if (pdfText[dataStart] === '\r' && pdfText[dataStart + 1] === '\n') dataStart += 2;
    else if (pdfText[dataStart] === '\n' || pdfText[dataStart] === '\r') dataStart += 1;

    const endStreamIndex = pdfText.indexOf(ENDSTREAM_KEYWORD, dataStart);
    if (endStreamIndex === -1) break;

    let dataEnd = endStreamIndex;
    while (dataEnd > dataStart && /[\r\n]/.test(pdfText[dataEnd - 1])) {
      dataEnd -= 1;
    }

    const rawData = bytesFromLatin1String(pdfText.slice(dataStart, dataEnd));

    try {
      const decodedStream = await decompressPdfStream(dict, rawData);
      if (decodedStream) {
        extractedSections.push(...extractTextObjects(decodedStream));
      }
    } catch (error) {
      console.warn('[PDF Import] Impossible de décoder un flux PDF:', error);
    }

    position = endStreamIndex + ENDSTREAM_KEYWORD.length;
  }

  return normalizeWhitespace(extractedSections.join('\n\n'));
}

export async function extractPdfTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return extractPdfTextFromArrayBuffer(buffer);
}

export function splitTextIntoKnowledgeChunks(text: string, maxChars = 1800, overlapChars = 250): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = '';

  const pushChunk = () => {
    const value = currentChunk.trim();
    if (value) chunks.push(value);
    currentChunk = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (currentChunk) pushChunk();
      let start = 0;
      while (start < paragraph.length) {
        const slice = paragraph.slice(start, start + maxChars).trim();
        if (slice) chunks.push(slice);
        if (start + maxChars >= paragraph.length) break;
        start += Math.max(1, maxChars - overlapChars);
      }
      continue;
    }

    const candidate = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      currentChunk = candidate;
      continue;
    }

    pushChunk();
    currentChunk = paragraph;
  }

  if (currentChunk) pushChunk();

  return chunks;
}

export function buildKnowledgeImportRows(params: {
  title: string;
  category: string;
  text: string;
  maxChars?: number;
  overlapChars?: number;
}): Array<{ title: string; category: string; content: string }> {
  const chunks = splitTextIntoKnowledgeChunks(params.text, params.maxChars, params.overlapChars);
  const total = chunks.length;

  return chunks.map((content, index) => ({
    title: total > 1 ? `${params.title} — Partie ${index + 1}/${total}` : params.title,
    category: params.category,
    content,
  }));
}
