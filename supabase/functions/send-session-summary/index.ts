import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  slug: string;
}

interface SessionSummaryPayload {
  user_id: string;
  user_email: string;
  user_name: string;
  started_at: string;       // ISO 8601
  ended_at: string;         // ISO 8601
  duration_sec: number;
  transcript: TranscriptMessage[];
  recommended_products: RecommendedProduct[];
  store_name: string;
  budtender_name: string;
}

// ─── Guard ────────────────────────────────────────────────────────────────────

export function shouldSendSummary(durationSec: number, userId: string | null): boolean {
  if (!userId) return false;
  return durationSec >= 10;
}

// ─── Session record builder ───────────────────────────────────────────────────

export function buildSessionRecord(payload: SessionSummaryPayload) {
  return {
    user_id: payload.user_id,
    started_at: payload.started_at,
    ended_at: payload.ended_at,
    duration_sec: payload.duration_sec,
    transcript: payload.transcript,
    recommended_products: payload.recommended_products,
    email_sent: false,
  };
}

// ─── Email template (inline — mirrors src/lib/emailTemplate.ts) ───────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildEmailHtml(payload: SessionSummaryPayload): string {
  const { user_name, store_name, budtender_name, started_at, duration_sec, recommended_products } = payload;
  const dateStr = formatDate(started_at);
  const durationStr = formatDuration(duration_sec);
  const catalogueBase = 'https://green-mood.fr/catalogue';

  const productRows =
    recommended_products.length > 0
      ? recommended_products
          .map(
            (p) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
            <a href="${catalogueBase}/${p.slug}" style="color:#16a34a;text-decoration:none;font-weight:500;">${p.name}</a>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#374151;">
            ${p.price.toFixed(2)} €
          </td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="2" style="padding:8px 0;color:#6b7280;font-style:italic;">Aucun produit recommandé</td></tr>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Résumé de votre session BudTender — ${store_name}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#16a34a;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${store_name}</h1>
              <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Résumé de votre session avec ${budtender_name}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:16px;">Bonjour <strong>${user_name}</strong>,</p>
              <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
                Merci d'avoir utilisé le BudTender IA de <strong>${store_name}</strong>.
                Voici le résumé de votre session du <strong>${dateStr}</strong> (durée : ${durationStr}).
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Date :</strong> ${dateStr}</td></tr>
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Durée :</strong> ${durationStr}</td></tr>
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Conseiller :</strong> ${budtender_name}</td></tr>
              </table>
              <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">Produits recommandés</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                ${productRows}
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                Cliquez sur un produit pour le retrouver dans notre catalogue.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Cet email a été envoyé automatiquement par ${store_name}.<br />
                Vous recevez ce message car vous avez utilisé notre BudTender IA.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload: SessionSummaryPayload = await req.json();

    // 1. Validate payload
    if (!payload.user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!shouldSendSummary(payload.duration_sec, payload.user_id)) {
      return new Response(
        JSON.stringify({ skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. INSERT into budtender_sessions
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: session, error: insertError } = await supabase
      .from('budtender_sessions')
      .insert(buildSessionRecord(payload))
      .select('id')
      .single();

    if (insertError || !session) {
      console.error('[send-session-summary] INSERT error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save session', details: insertError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sessionId: string = session.id;

    // 3. Send email via Resend (optional — try/catch so INSERT always succeeds)
    if (resendApiKey && payload.user_email) {
      try {
        const html = buildEmailHtml(payload);

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${payload.store_name} <noreply@green-mood.fr>`,
            to: [payload.user_email],
            subject: `Résumé de votre session BudTender — ${payload.store_name}`,
            html,
          }),
        });

        if (resendResponse.ok) {
          await supabase
            .from('budtender_sessions')
            .update({ email_sent: true })
            .eq('id', sessionId);
        } else {
          const resendError = await resendResponse.text();
          console.error('[send-session-summary] Resend error:', resendError);
        }
      } catch (emailErr) {
        console.error('[send-session-summary] Email send failed (non-fatal):', emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, session_id: sessionId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-session-summary] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
