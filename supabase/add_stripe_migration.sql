-- Migration: Add Stripe payment columns to orders table
-- Run this in the Supabase SQL editor

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe';

-- Optional index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON public.orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
