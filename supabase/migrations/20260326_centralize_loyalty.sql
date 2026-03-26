-- 1. Create the loyalty handling trigger function
CREATE OR REPLACE FUNCTION public.handle_loyalty_on_payment()
RETURNS trigger AS $$
DECLARE
  v_profile_points integer;
  v_new_balance integer;
BEGIN
  -- Detection of status change to 'paid'
  IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid') 
     OR (TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid')) THEN
     
    -- Ensure user_id is present
    IF NEW.user_id IS NOT NULL THEN
      -- Get user's current points
      SELECT loyalty_points INTO v_profile_points
      FROM public.profiles
      WHERE id = NEW.user_id
      FOR UPDATE;

      -- Calculate new balance
      v_new_balance := GREATEST(
        0,
        COALESCE(v_profile_points, 0)
        - COALESCE(NEW.loyalty_points_redeemed, 0)
        + COALESCE(NEW.loyalty_points_earned, 0)
      );

      -- Update profile
      UPDATE public.profiles
      SET loyalty_points = v_new_balance,
          updated_at = now()
      WHERE id = NEW.user_id;

      -- Log transactions
      IF COALESCE(NEW.loyalty_points_earned, 0) > 0 THEN
        INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, balance_after, note)
        VALUES (
          NEW.user_id,
          NEW.id,
          'earned',
          NEW.loyalty_points_earned,
          v_new_balance,
          'Commande #' || upper(left(NEW.id::text, 8))
        );
      END IF;

      IF COALESCE(NEW.loyalty_points_redeemed, 0) > 0 THEN
        INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, balance_after, note)
        VALUES (
          NEW.user_id,
          NEW.id,
          'redeemed',
          NEW.loyalty_points_redeemed,
          v_new_balance,
          'Utilisation de points sur commande #' || upper(left(NEW.id::text, 8))
        );
      END IF;
      
      -- Increment promo uses if applicable
      IF NEW.promo_code IS NOT NULL THEN
        UPDATE public.promo_codes 
        SET uses_count = uses_count + 1 
        WHERE code = NEW.promo_code;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Attach the trigger to the orders table
DROP TRIGGER IF EXISTS tr_loyalty_on_payment ON public.orders;
CREATE TRIGGER tr_loyalty_on_payment
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_loyalty_on_payment();

-- 3. Simplify finalizing function to just update status (trigger will handle loyalty)
CREATE OR REPLACE FUNCTION public.finalize_order_and_award_points(
  p_order_id uuid,
  p_payment_intent_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'processing',
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id)
  WHERE id = p_order_id
    AND payment_status != 'paid';
END;
$$;
