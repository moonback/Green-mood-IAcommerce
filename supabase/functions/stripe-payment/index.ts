import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: true, message: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, amount, customerEmail, customerName, description } = await req.json();

    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({ error: true, message: 'orderId and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stripe API REST — pas de SDK Node (runtime Deno)
    const body = new URLSearchParams({
      amount: String(Math.round(amount * 100)), // centimes
      currency: 'eur',
      'metadata[order_id]': orderId,
      'automatic_payment_methods[enabled]': 'true',
    });
    if (customerEmail) body.append('receipt_email', customerEmail);
    if (description) body.append('description', description);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Stripe API error:', data);
      return new Response(
        JSON.stringify({ error: true, message: data?.error?.message || 'Stripe error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ clientSecret: data.client_secret, paymentIntentId: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: true, message: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
