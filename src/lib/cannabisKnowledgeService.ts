import { supabase } from './supabase';
import { generateEmbedding } from './embeddings';
import { toPgVectorLiteral } from './vector';

export type EvidenceLabel =
  | 'Harmful'
  | 'Weak evidence'
  | 'Limited evidence'
  | 'Mixed evidence'
  | 'Moderate evidence'
  | 'Strong evidence'
  | 'Conclusive evidence';

export type CannabisKnowledgeResult = {
  condition: string;
  alternate_name: string | null;
  evidence_score: number;
  evidence_label: EvidenceLabel;
  summary: string | null;
  scientific_notes: string | null;
  source: string | null;
  study_link: string | null;
  similarity: number;
};

export function evidenceScoreToLabel(score: number): EvidenceLabel {
  switch (score) {
    case 0:
      return 'Harmful';
    case 1:
      return 'Weak evidence';
    case 2:
      return 'Limited evidence';
    case 3:
      return 'Mixed evidence';
    case 4:
      return 'Moderate evidence';
    case 5:
      return 'Strong evidence';
    case 6:
      return 'Conclusive evidence';
    default:
      return 'Weak evidence';
  }
}

type MatchCannabisConditionRow = {
  condition: string;
  alternate_name: string | null;
  evidence_score: number;
  simple_notes: string | null;
  scientific_notes: string | null;
  source_name: string | null;
  study_link: string | null;
  similarity: number;
};

export async function searchCannabisKnowledge(query: string): Promise<CannabisKnowledgeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryEmbedding = await generateEmbedding(trimmed);

  const { data, error } = await supabase.rpc('match_cannabis_conditions', {
    query_embedding: toPgVectorLiteral(queryEmbedding),
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) {
    throw new Error(`Cannabis knowledge search failed: ${error.message}`);
  }

  return ((data ?? []) as MatchCannabisConditionRow[]).map((row) => ({
    condition: row.condition,
    alternate_name: row.alternate_name,
    evidence_score: row.evidence_score,
    evidence_label: evidenceScoreToLabel(row.evidence_score),
    summary: row.simple_notes,
    scientific_notes: row.scientific_notes,
    source: row.source_name,
    study_link: row.study_link,
    similarity: row.similarity,
  }));
}
