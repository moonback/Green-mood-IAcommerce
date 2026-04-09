-- 📈 Analytics Funnel & Insights
-- Aggregates raw events into a conversion funnel for the Admin Dashboard.

CREATE OR REPLACE VIEW public.analytics_funnel_daily AS
WITH daily_sessions AS (
  SELECT 
    date_trunc('day', created_at) as event_date,
    session_id,
    bool_or(event_type = 'page_view') as has_viewed,
    bool_or(event_type = 'cart_add') as has_added_to_cart,
    bool_or(event_type = 'checkout_start') as has_started_checkout,
    bool_or(event_type = 'purchase') as has_purchased
  FROM public.analytics_events
  GROUP BY 1, 2
)
SELECT 
  event_date,
  count(session_id) as total_sessions,
  count(*) filter (where has_viewed) as unique_visitors,
  count(*) filter (where has_added_to_cart) as cart_adds,
  count(*) filter (where has_started_checkout) as checkout_starts,
  count(*) filter (where has_purchased) as conversion_count,
  ROUND((count(*) filter (where has_purchased))::numeric / NULLIF(count(*) filter (where has_viewed), 0) * 100, 2) as conversion_rate_percent
FROM daily_sessions
GROUP BY 1
ORDER BY 1 DESC;

-- Table to track most frequent searches (for "Insights BudTender")
-- This would be populated by the application when matchProductsRpc is called.
CREATE TABLE IF NOT EXISTS public.search_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text  TEXT        NOT NULL,
  results_count INT       DEFAULT 0,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_query_text ON public.search_logs(query_text);

-- Grant access to analytics view for admins
ALTER VIEW public.analytics_funnel_daily OWNER TO postgres;
GRANT SELECT ON public.analytics_funnel_daily TO authenticated;

-- RLS for search_logs: Only insert by all, Read only by admins
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_logs_insert_all" ON public.search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "search_logs_select_admin" ON public.search_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
