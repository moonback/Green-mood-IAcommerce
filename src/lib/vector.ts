export function toPgVectorLiteral(values: number[]): string {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Cannot build pgvector literal from an empty embedding.');
  }

  const serialized = values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error('Embedding contains non-finite numeric values.');
    }
    return String(value);
  });

  return `[${serialized.join(',')}]`;
}
