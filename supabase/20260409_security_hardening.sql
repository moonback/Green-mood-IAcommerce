-- 🛡️ Security Hardening Fixes
-- 1) Fix check_is_admin function to avoid accidental privilege escalation for null UIDs
-- 2) Update existing policies to use this function consistently

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  -- Service role always bypasses
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  -- Anonymous users are NEVER admins
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update analytics_events to use the centralized check
DROP POLICY IF EXISTS "analytics_events_select_admin" ON public.analytics_events;
CREATE POLICY "analytics_events_select_admin"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.check_is_admin());

-- Ensure profiles is also protected (Admins see all, users see self)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.check_is_admin());

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.check_is_admin())
  WITH CHECK (id = auth.uid() OR public.check_is_admin());

-- Protect Stripe Customer Mapping (Highly sensitive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_customers') THEN
    ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "stripe_customers_admin_all" ON public.stripe_customers;
    CREATE POLICY "stripe_customers_admin_all"
      ON public.stripe_customers FOR ALL
      TO authenticated
      USING (public.check_is_admin());
      
    DROP POLICY IF EXISTS "stripe_customers_self_select" ON public.stripe_customers;
    CREATE POLICY "stripe_customers_self_select"
      ON public.stripe_customers FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
