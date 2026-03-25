import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_CACHE_TTL_SECONDS = 60 * 30;
const MAX_CACHE_TTL_SECONDS = 60 * 60 * 24;
const inFlight = new Map<string, Promise<unknown>>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildCacheKey(payload: unknown): Promise<string> {
  return sha256(JSON.stringify(payload));
}

function clampTtlSeconds(ttl?: unknown): number {
  const parsed = typeof ttl === 'number' && Number.isFinite(ttl) ? Math.floor(ttl) : DEFAULT_CACHE_TTL_SECONDS;
  return Math.min(Math.max(parsed, 60), MAX_CACHE_TTL_SECONDS);
}

async function fetchOpenRouterJson(apiKey: string, payload: unknown): Promise<unknown> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://green-moon.fr',
      'X-Title': 'NeuroCart',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data && (data as Record<string, unknown>).error && ((data as Record<string, unknown>).error as Record<string, unknown>).message as string)
      || 'OpenRouter error');
  }

  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      model,
      messages,
      temperature,
      max_tokens,
      stream = false,
      cache_control,
      ...rest
    } = body;

    const selectedModel = model || 'mistralai/mistral-small-creative';

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: true, message: 'Messages array is required and cannot be empty' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      model: selectedModel,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 1000,
      stream,
      ...rest,
    };

    const bypassCache = Boolean(cache_control?.no_cache);
    const cacheTtlSeconds = clampTtlSeconds(cache_control?.ttl_seconds);
    const canUseCache = !stream && !bypassCache && Boolean(supabaseUrl && supabaseKey);

    let supabase = null;
    let cacheKey = '';

    if (canUseCache && supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
      cacheKey = await buildCacheKey(payload);

      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('response_json, expires_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached?.response_json) {
        console.log(`[Cache HIT] ai-chat response: ${cacheKey}`);
        supabase.rpc('increment_ai_response_cache_usage', { p_cache_key: cacheKey }).then();

        return new Response(JSON.stringify({ ...cached.response_json, cached: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (inFlight.has(cacheKey)) {
        const deduped = await inFlight.get(cacheKey);
        return new Response(JSON.stringify({ ...(deduped as Record<string, unknown>), deduped: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (stream) {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://green-moon.fr',
          'X-Title': 'NeuroCart',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const upstreamError = await response.text();
        console.error('OpenRouter stream error:', upstreamError);
        return new Response(JSON.stringify({
          error: true,
          message: 'OpenRouter stream error',
          details: upstreamError,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(response.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') ?? 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    let data: unknown;
    if (cacheKey) {
      const upstreamPromise = fetchOpenRouterJson(apiKey, payload);
      inFlight.set(cacheKey, upstreamPromise);
      try {
        data = await upstreamPromise;
      } finally {
        if (inFlight.get(cacheKey) === upstreamPromise) {
          inFlight.delete(cacheKey);
        }
      }
    } else {
      data = await fetchOpenRouterJson(apiKey, payload);
    }

    if (supabase && cacheKey) {
      await supabase
        .from('ai_response_cache')
        .upsert({
          cache_key: cacheKey,
          response_json: data,
          expires_at: new Date(Date.now() + cacheTtlSeconds * 1000).toISOString(),
        }, { onConflict: 'cache_key' });
      console.log(`[Cache SET] ai-chat response: ${cacheKey}, ttl=${cacheTtlSeconds}s`);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Function Error:', err);
    return new Response(JSON.stringify({ error: true, message: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
