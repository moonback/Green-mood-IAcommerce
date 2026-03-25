import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Vérification de la signature Stripe via HMAC-SHA256
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = sigHeader.split(',').reduce((acc, part) => {
      const [key, val] = part.split('=');
      acc[key] = val;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSig === signature;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Supabase config missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    const sigHeader = req.headers.get('stripe-signature') || '';

    // Vérification de la signature si le secret est configuré
    if (webhookSecret && sigHeader) {
      const valid = await verifyStripeSignature(body, sigHeader, webhookSecret);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const event = JSON.parse(body);
    console.log(`Stripe webhook event: ${event.type}`);

    const paymentIntent = event.data?.object;
    const orderId = paymentIntent?.metadata?.order_id;

    if (!orderId) {
      console.warn('No order_id in metadata');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const { error } = await supabase.rpc('finalize_order_and_award_points', {
          p_order_id: orderId,
          p_payment_intent_id: paymentIntent.id,
        });

        if (error) {
          console.error(`Failed to finalize order ${orderId}:`, error.message);
          return new Response(JSON.stringify({ error: 'Failed to finalize order' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Order ${orderId} finalized via RPC`);
        break;
      }

      case 'payment_intent.payment_failed': {
        await supabase.rpc('fail_order_and_restore_stock', {
          p_order_id: orderId,
          p_reason: 'Stripe payment failed',
        });
        console.log(`Order ${orderId} marked as failed and stock restored`);
        break;
      }

      case 'charge.refunded': {
        await supabase
          .from('orders')
          .update({ payment_status: 'refunded' })
          .eq('stripe_payment_intent_id', paymentIntent.payment_intent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
