-- ─── Analytics Events Table ────────────────────────────────────────────────
-- Tracks page views, cart events, checkout steps and purchases.
-- Used by AdminAnalyticsTab for funnel, heatmap, traffic source and
-- cart abandonment metrics.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    TEXT        NOT NULL,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    TEXT        NOT NULL, -- 'page_view' | 'cart_add' | 'checkout_start' | 'purchase' | 'cart_abandon'
  page          TEXT,
  referrer      TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  payload       JSONB       DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient range + type queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type  ON public.analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id  ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id     ON public.analytics_events (user_id);

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous + authenticated visitors)
CREATE POLICY "analytics_events_insert_all"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "analytics_events_select_admin"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
