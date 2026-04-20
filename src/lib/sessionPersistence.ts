import type { TranscriptMessage, RecommendedProduct } from '../types/budtenderSession';

export interface SessionPayload {
  userId: string;
  transcript: TranscriptMessage[];
  recommendedProducts: RecommendedProduct[];
  durationSec: number;
  startedAt: Date;
  endedAt: Date;
}

export interface SessionRecord {
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  transcript: TranscriptMessage[];
  recommended_products: RecommendedProduct[];
  email_sent: boolean;
}

export function buildSessionRecord(payload: SessionPayload): SessionRecord {
  return {
    user_id: payload.userId,
    started_at: payload.startedAt.toISOString(),
    ended_at: payload.endedAt.toISOString(),
    duration_sec: payload.durationSec,
    transcript: payload.transcript,
    recommended_products: payload.recommendedProducts,
    email_sent: false,
  };
}
