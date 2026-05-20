import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WINEENGINE_TENANT = 'sakescan';
const WINEENGINE_URL = `https://wineengine.tineye.com/${WINEENGINE_TENANT}/rest/search/`;

const SCORE_THRESHOLD = 25;
const MATCH_PERCENT_THRESHOLD = 40;

type ProviderUsed = 'wineengine' | 'openai' | 'wineengine+openai' | 'none';

interface SakeInfo {
  name: string;
  nameJapanese?: string;
  brewery: string;
  type?: string;
  subtype?: string;
  prefecture?: string;
  region?: string;
  description?: string;
  tastingNotes?: string;
  foodPairings?: string[];
  riceVariety?: string;
  polishingRatio?: number;
  alcoholPercentage?: number;
  flavorProfile?: string[];
  servingTemperature?: string[];
  confidenceScore?: number;
  scanQualityHint?: 'high' | 'medium' | 'low';
}

interface WineEngineMetadata {
  text_lines?: string[];
  text_tokens?: string[];
  region_name?: string;
  country_name?: string;
  country_name_inferred?: string;
  variety_type?: string;
  vintage_year?: number | string;
  misc_info?: string[];
}

interface WineEngineMatch {
  filepath: string;
  score: number;
  score_text?: number;
  match_percent: number;
  metadata?: WineEngineMetadata;
}

interface WineEngineResponse {
  status: string;
  error?: string[];
  query_image?: {
    filepath?: string;
    metadata?: WineEngineMetadata;
  };
  result?: WineEngineMatch[];
  stats?: Record<string, number>;
}

interface OpenAIExtractedSake {
  name?: string;
  name_japanese?: string;
  brewery?: string;
  type?: string;
  subtype?: string;
  prefecture?: string;
  region?: string;
  description?: string;
  tasting_notes?: string;
  food_pairings?: string;
  rice_variety?: string;
  polishing_ratio?: number;
  alcohol_percentage?: number;
  flavor_profile?: string[];
  serving_temperature?: string[];
}

function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function trimNonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function callWineEngine(imageBase64: string): Promise<{
  ok: boolean;
  status: number;
  data?: WineEngineResponse;
  errorText?: string;
  latencyMs: number;
}> {
  const username = Deno.env.get('WINEENGINE_USERNAME') ?? '';
  const password = Deno.env.get('WINEENGINE_PASSWORD') ?? '';
  const started = Date.now();

  if (!username || !password) {
    return Promise.resolve({
      ok: false,
      status: 0,
      errorText: 'WineEngine credentials not configured (WINEENGINE_USERNAME / WINEENGINE_PASSWORD)',
      latencyMs: 0,
    });
  }

  const bytes = base64ToBytes(imageBase64);
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/jpeg' }), 'query.jpg');
  form.append('limit', '1');

  return fetch(WINEENGINE_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` },
    body: form,
  })
    .then(async (res) => {
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          errorText: await res.text().catch(() => ''),
          latencyMs,
        };
      }
      const data = (await res.json()) as WineEngineResponse;
      return { ok: true, status: res.status, data, latencyMs };
    })
    .catch((err) => ({
      ok: false,
      status: 0,
      errorText: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - started,
    }));
}

function isJapaneseText(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
}

function buildSakeFromWineEngine(weData: WineEngineResponse): {
  guess: SakeInfo | null;
  topMatchScore: number;
  topMatchPercent: number;
} {
  const top = weData.result?.[0];
  const queryMeta = weData.query_image?.metadata ?? {};
  const matchMeta = top?.metadata ?? {};

  const lines = (queryMeta.text_lines ?? [])
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const tokens = (queryMeta.text_tokens ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (lines.length === 0 && tokens.length === 0) {
    return { guess: null, topMatchScore: top?.score ?? 0, topMatchPercent: top?.match_percent ?? 0 };
  }

  const japaneseLines = lines.filter((l) => isJapaneseText(l));
  const englishLines = lines.filter((l) => !isJapaneseText(l));

  const candidateName =
    englishLines[0] ??
    japaneseLines[0] ??
    lines[0] ??
    tokens[0] ??
    '';

  const candidateBrewery =
    englishLines[1] ??
    japaneseLines[1] ??
    lines[1] ??
    tokens[1] ??
    '';

  const candidateJapanese = japaneseLines[0];

  const guess: SakeInfo = {
    name: candidateName,
    nameJapanese: candidateJapanese,
    brewery: candidateBrewery,
    region: trimNonEmpty(matchMeta.region_name) ?? trimNonEmpty(queryMeta.region_name),
    prefecture: trimNonEmpty(queryMeta.country_name) ?? trimNonEmpty(queryMeta.country_name_inferred),
  };

  return {
    guess,
    topMatchScore: top?.score ?? 0,
    topMatchPercent: top?.match_percent ?? 0,
  };
}

interface OpenAIRunResult {
  ok: boolean;
  sake?: SakeInfo;
  errorText?: string;
  latencyMs: number;
}

function runOpenAIVision(imageBase64: string): Promise<OpenAIRunResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const started = Date.now();

  if (!apiKey) {
    return Promise.resolve({
      ok: false,
      errorText: 'OPENAI_API_KEY not configured',
      latencyMs: 0,
    });
  }

  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this sake bottle label and extract ALL information you can find. Return a JSON object with these fields (omit fields you cannot determine):
{
  "name": "English name of the sake",
  "name_japanese": "Japanese name (if visible)",
  "brewery": "Brewery name",
  "type": "Main type (e.g., Junmai, Ginjo, Daiginjo, Honjozo)",
  "subtype": "Subtype if applicable",
  "prefecture": "Prefecture/region in Japan",
  "region": "Broader region",
  "description": "1-2 sentence description",
  "tasting_notes": "Flavor profile",
  "food_pairings": "Recommended pairings",
  "rice_variety": "Type of rice if mentioned",
  "polishing_ratio": 50,
  "alcohol_percentage": 15.5,
  "flavor_profile": ["Crisp", "Floral"],
  "serving_temperature": ["Chilled"]
}
Be factual. Do not invent values.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    }),
  })
    .then(async (res) => {
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        return {
          ok: false,
          errorText: `OpenAI ${res.status}: ${await res.text().catch(() => '')}`,
          latencyMs,
        };
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        return { ok: false, errorText: 'OpenAI returned empty content', latencyMs };
      }
      let extracted: OpenAIExtractedSake;
      try {
        const jsonMatch =
          content.match(/```json\n([\s\S]*?)\n```/) ?? content.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        extracted = JSON.parse(jsonStr);
      } catch (err) {
        return {
          ok: false,
          errorText: `Failed to parse OpenAI JSON: ${err instanceof Error ? err.message : String(err)}`,
          latencyMs,
        };
      }
      const sake: SakeInfo = {
        name: extracted.name ?? '',
        nameJapanese: trimNonEmpty(extracted.name_japanese),
        brewery: extracted.brewery ?? '',
        type: trimNonEmpty(extracted.type),
        subtype: trimNonEmpty(extracted.subtype),
        prefecture: trimNonEmpty(extracted.prefecture),
        region: trimNonEmpty(extracted.region),
        description: trimNonEmpty(extracted.description),
        tastingNotes: trimNonEmpty(extracted.tasting_notes),
        foodPairings: typeof extracted.food_pairings === 'string'
          ? extracted.food_pairings
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : undefined,
        riceVariety: trimNonEmpty(extracted.rice_variety),
        polishingRatio: typeof extracted.polishing_ratio === 'number' ? extracted.polishing_ratio : undefined,
        alcoholPercentage: typeof extracted.alcohol_percentage === 'number' ? extracted.alcohol_percentage : undefined,
        flavorProfile: Array.isArray(extracted.flavor_profile) ? extracted.flavor_profile : undefined,
        servingTemperature: Array.isArray(extracted.serving_temperature) ? extracted.serving_temperature : undefined,
      };
      if (!sake.name && !sake.brewery) {
        return { ok: false, errorText: 'OpenAI did not return name or brewery', latencyMs };
      }
      return { ok: true, sake, latencyMs };
    })
    .catch((err) => ({
      ok: false,
      errorText: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - started,
    }));
}

async function lookupSakeInDb(
  supabase: ReturnType<typeof createClient>,
  guess: SakeInfo,
): Promise<{ id: string; row: Record<string, unknown> } | null> {
  const name = guess.name?.trim();
  const nameJp = guess.nameJapanese?.trim();
  const brewery = guess.brewery?.trim();

  if (!name && !nameJp) return null;

  const filters: string[] = [];
  if (name) filters.push(`name.ilike.%${name}%`);
  if (nameJp) filters.push(`name_japanese.ilike.%${nameJp}%`);
  if (filters.length === 0) return null;

  let query = supabase
    .from('sake')
    .select('*')
    .or(filters.join(','))
    .limit(1);

  if (brewery) query = query.ilike('brewery', `%${brewery}%`);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn('Sake DB lookup error:', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return { id: String(row.id ?? ''), row };
}

async function enrichSakeRow(
  supabase: ReturnType<typeof createClient>,
  sakeId: string,
  existing: Record<string, unknown>,
  fromWineEngine: SakeInfo,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  const isEmpty = (v: unknown) => v == null || (typeof v === 'string' && v.trim().length === 0);

  if (isEmpty(existing.region) && fromWineEngine.region) updates.region = fromWineEngine.region;
  if (isEmpty(existing.prefecture) && fromWineEngine.prefecture) updates.prefecture = fromWineEngine.prefecture;
  if (isEmpty(existing.name_japanese) && fromWineEngine.nameJapanese) updates.name_japanese = fromWineEngine.nameJapanese;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from('sake').update(updates).eq('id', sakeId);
  if (error) {
    console.warn('Sake enrichment update failed:', error.message);
  } else {
    console.log(`Enriched sake ${sakeId} with`, Object.keys(updates));
  }
}

async function logExperiment(
  supabase: ReturnType<typeof createClient>,
  payload: {
    user_id: string | null;
    provider_used: ProviderUsed;
    wineengine_score: number | null;
    wineengine_match_percent: number | null;
    wineengine_text_tokens: string[] | null;
    wineengine_filepath: string | null;
    openai_used: boolean;
    latency_ms_we: number | null;
    latency_ms_oai: number | null;
    matched_sake_id: string | null;
    error: string | null;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from('scan_experiments').insert(payload);
    if (error) console.warn('scan_experiments insert failed:', error.message);
  } catch (err) {
    console.warn('scan_experiments insert exception:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const totalStart = Date.now();

  try {
    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'No image_base64 provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization') ?? '';
      const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (jwt) {
        const { data } = await supabase.auth.getUser(jwt);
        userId = data?.user?.id ?? null;
      }
    } catch {
      userId = null;
    }

    console.log('🔍 scan-label-v2: calling WineEngine first...');
    const we = await callWineEngine(image_base64);

    let providerUsed: ProviderUsed = 'none';
    let openaiUsed = false;
    let oaiLatencyMs: number | null = null;
    let weScore: number | null = null;
    let weMatchPercent: number | null = null;
    let weTextTokens: string[] | null = null;
    let weFilepath: string | null = null;
    let weLatencyMs: number | null = we.latencyMs;
    let matchedSakeId: string | null = null;
    let resolvedSake: SakeInfo | null = null;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let topLevelError: string | null = null;

    if (we.ok && we.data?.status === 'ok') {
      const top = we.data.result?.[0];
      weScore = top?.score ?? 0;
      weMatchPercent = top?.match_percent ?? 0;
      weTextTokens = we.data.query_image?.metadata?.text_tokens ?? null;
      weFilepath = top?.filepath ?? null;
      console.log(
        `WineEngine: score=${weScore}, match_percent=${weMatchPercent}, latency=${we.latencyMs}ms`,
      );

      const isConfident =
        (weScore ?? 0) >= SCORE_THRESHOLD && (weMatchPercent ?? 0) >= MATCH_PERCENT_THRESHOLD;

      if (isConfident) {
        const { guess } = buildSakeFromWineEngine(we.data);
        if (guess && (guess.name || guess.brewery)) {
          providerUsed = 'wineengine';
          resolvedSake = guess;
          confidence = (weScore ?? 0) >= SCORE_THRESHOLD * 1.5 ? 'high' : 'medium';

          const found = await lookupSakeInDb(supabase, guess);
          if (found) {
            matchedSakeId = found.id;
            await enrichSakeRow(supabase, found.id, found.row, guess);
          }
        }
      }
    } else if (!we.ok) {
      console.warn('WineEngine call failed:', we.status, we.errorText);
    }

    if (!resolvedSake) {
      console.log('🔍 scan-label-v2: falling back to OpenAI Vision...');
      const oai = await runOpenAIVision(image_base64);
      openaiUsed = true;
      oaiLatencyMs = oai.latencyMs;

      if (oai.ok && oai.sake) {
        providerUsed = providerUsed === 'wineengine' ? 'wineengine+openai' : 'openai';
        resolvedSake = oai.sake;
        confidence = 'medium';
        const found = await lookupSakeInDb(supabase, oai.sake);
        if (found) matchedSakeId = found.id;
      } else {
        topLevelError = oai.errorText ?? 'OpenAI fallback failed';
      }
    }

    await logExperiment(supabase, {
      user_id: userId,
      provider_used: providerUsed,
      wineengine_score: weScore,
      wineengine_match_percent: weMatchPercent,
      wineengine_text_tokens: weTextTokens,
      wineengine_filepath: weFilepath,
      openai_used: openaiUsed,
      latency_ms_we: weLatencyMs,
      latency_ms_oai: oaiLatencyMs,
      matched_sake_id: matchedSakeId,
      error: topLevelError,
    });

    if (!resolvedSake) {
      return new Response(
        JSON.stringify({
          success: false,
          provider: providerUsed,
          error: topLevelError ?? 'Could not identify sake label',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: providerUsed,
        confidence,
        matched_sake_id: matchedSakeId,
        sake: resolvedSake,
        wineengine: weScore != null ? { score: weScore, match_percent: weMatchPercent } : undefined,
        total_latency_ms: Date.now() - totalStart,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in scan-label-v2:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
