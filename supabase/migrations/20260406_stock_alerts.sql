-- Migration: Add stock_alerts table
-- Path: supabase/migrations/20260406_stock_alerts.sql

CREATE TABLE IF NOT EXISTS public.stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL -- 'active', 'notified', 'cancelled'
);

-- Constraint for conflict handling (upsert)
ALTER TABLE public.stock_alerts 
ADD CONSTRAINT stock_alerts_user_id_product_id_key 
UNIQUE(user_id, product_id);

-- Enable RLS
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own alerts
CREATE POLICY "Users can manage their own stock alerts"
ON public.stock_alerts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admins to see all alerts
CREATE POLICY "Admins can view all stock alerts"
ON public.stock_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Grant privileges
GRANT ALL ON public.stock_alerts TO authenticated;
GRANT ALL ON public.stock_alerts TO service_role;
GRANT ALL ON public.stock_alerts TO anon;
