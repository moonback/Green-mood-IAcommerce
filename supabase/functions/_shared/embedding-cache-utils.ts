export const DEFAULT_EMBEDDING_DIMENSIONS = 3072;

export function toValidEmbeddingVector(value: unknown, expectedDimensions = DEFAULT_EMBEDDING_DIMENSIONS): number[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length !== expectedDimensions) return null;

  for (const item of value) {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      return null;
    }
  }

  return value as number[];
}

export function normalizeEmbeddingInput(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
