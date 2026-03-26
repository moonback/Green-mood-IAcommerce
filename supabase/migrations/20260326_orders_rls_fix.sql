-- 1. Allow users to update their own orders' payment_status to 'paid' 
-- This is necessary for the dev simulator and potentially for some payment flows
CREATE POLICY "orders_owner_update_status" ON "public"."orders"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND payment_status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- 2. Ensure loyalty trigger handles status changes correctly (already done in previous plan, but double-checking)
-- The trigger tr_loyalty_on_payment already fires on ANY update to orders where payment_status becomes 'paid'.
