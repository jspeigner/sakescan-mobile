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

/** User-safe scan error; never expose API keys or raw provider JSON. */
function toPublicScanError(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return 'Could not identify this sake label. Try a clearer photo of the front label.';
  }
  const lower = raw.toLowerCase();
  if (
    lower.includes('invalid_api_key') ||
    lower.includes('incorrect api key') ||
    lower.includes('openai 401') ||
    lower.includes('openai 403')
  ) {
    return 'Label scan is temporarily unavailable. Please try again in a few minutes.';
  }
  if (lower.includes('insufficient_quota') || lower.includes('billing')) {
    return 'Label scan is temporarily unavailable due to service limits. Please try again later.';
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    return 'Too many scans right now. Please wait a moment and try again.';
  }
  if (lower.includes('wineengine credentials not configured')) {
    return 'Could not identify this sake label. Try a clearer photo of the front label.';
  }
  if (raw.length > 160 || raw.includes('{') || raw.includes('sk-')) {
    return 'Could not identify this sake label. Try a clearer photo of the front label.';
  }
  return raw;
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
        const body = await res.text().catch(() => '');
        console.error(`OpenAI Vision failed: ${res.status}`, body.slice(0, 500));
        return {
          ok: false,
          errorText: `OpenAI ${res.status}: ${body}`,
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

function parseRichDescriptionFields(description: string | null): {
  mainDescription: string;
  tastingNotes?: string;
  foodPairings?: string[];
  flavorProfile?: string[];
  servingTemperature?: string[];
} {
  const raw = description?.trim() ?? '';
  if (!raw) return { mainDescription: '' };

  const descParts = raw.split(/\n\n\*\*/);
  const mainDescription = descParts[0]?.trim() ?? '';
  const extractField = (label: string): string | null => {
    const part = descParts.find((p) => p.startsWith(`${label}:**`));
    return part ? part.replace(`${label}:** `, '').trim() : null;
  };
  const foodPairingsRaw = extractField('Food Pairings');
  const flavorProfileRaw = extractField('Flavor Profile');
  const servingTempsRaw = extractField('Serving Temperature');

  return {
    mainDescription,
    tastingNotes: extractField('Tasting Notes') ?? undefined,
    foodPairings: foodPairingsRaw ? foodPairingsRaw.split(', ').filter(Boolean) : undefined,
    flavorProfile: flavorProfileRaw ? flavorProfileRaw.split(', ').filter(Boolean) : undefined,
    servingTemperature: servingTempsRaw ? servingTempsRaw.split(', ').filter(Boolean) : undefined,
  };
}

function dbRowToSakeInfo(row: Record<string, unknown>): SakeInfo {
  const rich = parseRichDescriptionFields(
    typeof row.description === 'string' ? row.description : null,
  );
  const description =
    rich.mainDescription.length > 0
      ? rich.mainDescription
      : (typeof row.description === 'string' ? row.description.trim() : '');

  return {
    name: String(row.name ?? ''),
    nameJapanese: trimNonEmpty(row.name_japanese),
    brewery: String(row.brewery ?? ''),
    type: trimNonEmpty(row.type) ?? 'Sake',
    subtype: trimNonEmpty(row.subtype),
    prefecture: trimNonEmpty(row.prefecture),
    region: trimNonEmpty(row.region),
    description,
    tastingNotes: rich.tastingNotes,
    foodPairings: rich.foodPairings,
    riceVariety: trimNonEmpty(row.rice_variety),
    polishingRatio:
      typeof row.polishing_ratio === 'number' && Number.isFinite(row.polishing_ratio)
        ? row.polishing_ratio
        : undefined,
    alcoholPercentage:
      typeof row.alcohol_percentage === 'number' && Number.isFinite(row.alcohol_percentage)
        ? row.alcohol_percentage
        : undefined,
    flavorProfile: rich.flavorProfile,
    servingTemperature: rich.servingTemperature,
    scanQualityHint: 'high',
  };
}

function catalogSearchToken(name: string | undefined): string | null {
  if (!name?.trim()) return null;
  const cleaned = name.trim().replace(/[^\w\s\u3040-\u30ff\u3400-\u9fff]/g, ' ');
  const parts = cleaned.split(/\s+/).filter((p) => p.length >= 2);
  if (parts.length === 0) return null;
  return parts[0];
}

function scoreCatalogRow(
  row: Record<string, unknown>,
  guessName: string,
  guessNameJp?: string,
): number {
  const name = String(row.name ?? '').toLowerCase();
  const nameJp = String(row.name_japanese ?? '').toLowerCase();
  const g = guessName.toLowerCase();
  const gJp = guessNameJp?.toLowerCase() ?? '';
  let score = 0;

  if (name === g || (gJp && nameJp === gJp)) score += 120;
  if (name.includes(g) || g.includes(name)) score += 60;
  if (gJp && (nameJp.includes(gJp) || name.includes(gJp))) score += 40;

  const nums = (s: string) => s.match(/\d+/g) ?? [];
  const gNums = nums(g);
  const nNums = nums(name);
  if (gNums.length > 0 && gNums.some((n) => nNums.includes(n))) score += 35;

  const ratings = typeof row.total_ratings === 'number' ? row.total_ratings : 0;
  score += Math.min(ratings, 20);

  return score;
}

function pickBestCatalogRow(
  rows: Record<string, unknown>[],
  guessName: string,
  guessNameJp?: string,
): { id: string; row: Record<string, unknown> } | null {
  if (rows.length === 0) return null;
  let best = rows[0];
  let bestScore = scoreCatalogRow(best, guessName, guessNameJp);
  for (let i = 1; i < rows.length; i++) {
    const s = scoreCatalogRow(rows[i], guessName, guessNameJp);
    if (s > bestScore) {
      bestScore = s;
      best = rows[i];
    }
  }
  return { id: String(best.id ?? ''), row: best };
}

async function querySakeByGuess(
  supabase: ReturnType<typeof createClient>,
  guess: SakeInfo,
  options: { filterBrewery: boolean },
): Promise<{ id: string; row: Record<string, unknown> } | null> {
  const name = guess.name?.trim();
  const nameJp = guess.nameJapanese?.trim();
  const brewery = guess.brewery?.trim();

  if (!name && !nameJp) return null;

  const filters: string[] = [];
  if (name) filters.push(`name.ilike.%${name}%`);
  if (nameJp) filters.push(`name_japanese.ilike.%${nameJp}%`);

  let query = supabase.from('sake').select('*').or(filters.join(',')).limit(5);

  if (options.filterBrewery && brewery && brewery !== 'Unknown brewery') {
    query = query.ilike('brewery', `%${brewery}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Sake DB lookup error:', error.message);
    return null;
  }
  if (!data?.length) return null;

  if (data.length === 1) {
    const row = data[0] as Record<string, unknown>;
    return { id: String(row.id ?? ''), row };
  }

  return pickBestCatalogRow(data as Record<string, unknown>[], name ?? '', nameJp);
}

async function lookupSakeInDb(
  supabase: ReturnType<typeof createClient>,
  guess: SakeInfo,
): Promise<{ id: string; row: Record<string, unknown> } | null> {
  const name = guess.name?.trim();
  const nameJp = guess.nameJapanese?.trim();
  if (!name && !nameJp) return null;

  const withBrewery = await querySakeByGuess(supabase, guess, { filterBrewery: true });
  if (withBrewery) return withBrewery;

  const nameOnly = await querySakeByGuess(supabase, guess, { filterBrewery: false });
  if (nameOnly) return nameOnly;

  const token = catalogSearchToken(name);
  if (!token || token.length < 3) return null;

  const { data, error } = await supabase
    .from('sake')
    .select('*')
    .ilike('name', `%${token}%`)
    .order('total_ratings', { ascending: false })
    .limit(12);

  if (error || !data?.length) return null;

  return pickBestCatalogRow(data as Record<string, unknown>[], name, nameJp);
}

async function applyCatalogMatch(
  supabase: ReturnType<typeof createClient>,
  found: { id: string; row: Record<string, unknown> },
  scanGuess: SakeInfo,
): Promise<{ id: string; sake: SakeInfo }> {
  await enrichSakeRow(supabase, found.id, found.row, scanGuess);
  const { data: refreshed } = await supabase
    .from('sake')
    .select('*')
    .eq('id', found.id)
    .maybeSingle();

  const row = (refreshed ?? found.row) as Record<string, unknown>;
  return { id: found.id, sake: dbRowToSakeInfo(row) };
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
    let openaiErrorRaw: string | null = null;

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
            const catalog = await applyCatalogMatch(supabase, found, guess);
            matchedSakeId = catalog.id;
            resolvedSake = catalog.sake;
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
        confidence = 'medium';
        const found = await lookupSakeInDb(supabase, oai.sake);
        if (found) {
          const catalog = await applyCatalogMatch(supabase, found, oai.sake);
          matchedSakeId = catalog.id;
          resolvedSake = catalog.sake;
        } else {
          resolvedSake = oai.sake;
        }
      } else {
        openaiErrorRaw = oai.errorText ?? null;
        topLevelError = toPublicScanError(openaiErrorRaw ?? 'OpenAI fallback failed');
      }
    }

    const experimentError =
      openaiErrorRaw != null ? openaiErrorRaw.slice(0, 500) : topLevelError;

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
      error: experimentError,
    });

    if (!resolvedSake) {
      return new Response(
        JSON.stringify({
          success: false,
          provider: providerUsed,
          error: toPublicScanError(topLevelError),
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
        error: toPublicScanError(error instanceof Error ? error.message : 'Unknown error'),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
