CREATE OR REPLACE FUNCTION public.reserve_stock_and_create_order(
  p_user_id uuid,
  p_items jsonb,
  p_delivery_type text,
  p_address_id uuid,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_points_earned integer,
  p_points_redeemed integer,
  p_promo_code text,
  p_promo_discount numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_stock integer;
  v_available boolean;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity, is_available
    INTO v_stock, v_available
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    IF NOT FOUND OR v_available = false THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE:%', v_item->>'product_id';
    END IF;

    IF v_stock < (v_item->>'quantity')::integer THEN
      RAISE EXCEPTION 'STOCK_INSUFFICIENT:%', v_item->>'product_id';
    END IF;

    UPDATE public.products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer
    WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;

  INSERT INTO public.orders (
    user_id,
    delivery_type,
    address_id,
    subtotal,
    delivery_fee,
    total,
    loyalty_points_earned,
    loyalty_points_redeemed,
    promo_code,
    promo_discount,
    payment_status,
    status
  ) VALUES (
    p_user_id,
    p_delivery_type,
    p_address_id,
    p_subtotal,
    p_delivery_fee,
    p_total,
    p_points_earned,
    p_points_redeemed,
    p_promo_code,
    p_promo_discount,
    'pending',
    'pending'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    total_price
  )
  SELECT
    v_order_id,
    (value->>'product_id')::uuid,
    value->>'product_name',
    (value->>'unit_price')::numeric,
    (value->>'quantity')::integer,
    ((value->>'unit_price')::numeric * (value->>'quantity')::integer)
  FROM jsonb_array_elements(p_items);

  INSERT INTO public.stock_movements (
    product_id,
    quantity_change,
    type,
    note
  )
  SELECT
    (value->>'product_id')::uuid,
    -((value->>'quantity')::integer),
    'sale',
    'Commande ' || left(v_order_id::text, 8)
  FROM jsonb_array_elements(p_items);

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id uuid,
  p_quantity integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_stock_and_create_order(
  uuid,
  jsonb,
  text,
  uuid,
  numeric,
  numeric,
  numeric,
  integer,
  integer,
  text,
  numeric
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_order_and_award_points(
  p_order_id uuid,
  p_payment_intent_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_profile_points integer;
  v_new_balance integer;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND:%', p_order_id;
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'processing',
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id)
  WHERE id = p_order_id;

  SELECT loyalty_points INTO v_profile_points
  FROM public.profiles
  WHERE id = v_order.user_id
  FOR UPDATE;

  v_new_balance := GREATEST(
    0,
    COALESCE(v_profile_points, 0)
    - COALESCE(v_order.loyalty_points_redeemed, 0)
    + COALESCE(v_order.loyalty_points_earned, 0)
  );

  UPDATE public.profiles
  SET loyalty_points = v_new_balance,
      updated_at = now()
  WHERE id = v_order.user_id;

  IF COALESCE(v_order.loyalty_points_earned, 0) > 0 THEN
    INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, balance_after, note)
    VALUES (
      v_order.user_id,
      v_order.id,
      'earned',
      v_order.loyalty_points_earned,
      v_new_balance,
      'Commande #' || upper(left(v_order.id::text, 8))
    );
  END IF;

  IF COALESCE(v_order.loyalty_points_redeemed, 0) > 0 THEN
    INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, balance_after, note)
    VALUES (
      v_order.user_id,
      v_order.id,
      'redeemed',
      v_order.loyalty_points_redeemed,
      v_new_balance,
      'Utilisation de points sur commande #' || upper(left(v_order.id::text, 8))
    );
  END IF;

  IF v_order.promo_code IS NOT NULL THEN
    PERFORM public.increment_promo_uses(v_order.promo_code);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_order_and_restore_stock(
  p_order_id uuid,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_order.payment_status = 'failed' OR v_order.payment_status = 'cancelled' THEN
    RETURN;
  END IF;

  UPDATE public.orders
  SET payment_status = 'failed',
      status = 'cancelled'
  WHERE id = p_order_id;

  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity + v_item.quantity
    WHERE id = v_item.product_id;

    INSERT INTO public.stock_movements (product_id, quantity_change, type, note)
    VALUES (
      v_item.product_id,
      v_item.quantity,
      'return',
      COALESCE(p_reason, 'Paiement échoué') || ' — commande ' || left(p_order_id::text, 8)
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_order_and_award_points(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_order_and_restore_stock(uuid, text) TO authenticated, service_role;
