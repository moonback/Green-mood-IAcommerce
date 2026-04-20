export interface TranscriptMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number; // Unix ms
}

export interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  slug: string;
}

export interface BudTenderSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  transcript: TranscriptMessage[];
  recommended_products: RecommendedProduct[];
  email_sent: boolean;
  created_at: string;
}

export interface SessionEndData {
  startedAt: number;
  endedAt: number;
  transcript: TranscriptMessage[];
  recommendedProducts: RecommendedProduct[];
}
