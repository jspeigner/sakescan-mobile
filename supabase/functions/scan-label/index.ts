import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Sake label Vision extract — OpenAI key stays server-side (OPENAI_API_KEY secret).
 * Default model: gpt-4o-mini; escalates to gpt-4o when mini fails or (for corrections) returns weak extract.
 * Optional back_image_base64 + rejected context for wrong-sake → back-label correction.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SakeRow {
  id: string;
  name: string;
  name_japanese: string | null;
  brewery: string;
  type: string | null;
  subtype: string | null;
  region: string | null;
  prefecture: string | null;
  description: string | null;
  rice_variety: string | null;
  polishing_ratio: number | null;
  alcohol_percentage: number | null;
  image_url: string | null;
  average_rating: number | null;
  total_ratings: number;
}

interface ExtractedLabel {
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
}

interface MatchCandidate {
  id: string;
  name: string;
  brewery: string;
  name_japanese: string | null;
  type: string | null;
  image_url: string | null;
  polishing_ratio: number | null;
  average_rating: number | null;
  total_ratings: number;
  score: number;
  has_label_images?: boolean;
}

interface RejectedBottle {
  sakeId?: string;
  name?: string;
  brewery?: string;
}

const LABEL_JSON_SCHEMA = {
  name: 'sake_label',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      nameJapanese: { type: 'string' },
      brewery: { type: 'string' },
      type: { type: 'string' },
      subtype: { type: 'string' },
      prefecture: { type: 'string' },
      region: { type: 'string' },
      description: { type: 'string' },
      tastingNotes: { type: 'string' },
      foodPairings: {
        type: 'array',
        items: { type: 'string' },
      },
      riceVariety: { type: 'string' },
      polishingRatio: { type: 'number' },
      alcoholPercentage: { type: 'number' },
      flavorProfile: {
        type: 'array',
        items: { type: 'string' },
      },
      servingTemperature: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['name', 'brewery'],
  },
} as const;

type OpenAIChatResult =
  | { ok: true; content: string; finishReason?: string; model: string }
  | { ok: false; status: number; message: string; model: string };

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isUnknownMarker(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized === 'unknown' ||
    normalized === 'n/a' ||
    normalized === 'none' ||
    normalized === 'not specified' ||
    normalized === 'unspecified' ||
    normalized === 'not listed' ||
    normalized === 'not available'
  );
}

function toKnownOptionalString(value: unknown): string | undefined {
  const str = toOptionalString(value);
  if (!str || isUnknownMarker(str)) return undefined;
  return str;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => toKnownOptionalString(item))
    .filter((item): item is string => Boolean(item));
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeExtracted(raw: Record<string, unknown>): ExtractedLabel | null {
  const name = toKnownOptionalString(raw.name);
  const brewery = toKnownOptionalString(raw.brewery);
  if (!name || !brewery) return null;

  return {
    name,
    brewery,
    nameJapanese: toKnownOptionalString(raw.nameJapanese ?? raw.name_japanese),
    type: toKnownOptionalString(raw.type),
    subtype: toKnownOptionalString(raw.subtype),
    prefecture: toKnownOptionalString(raw.prefecture),
    region: toKnownOptionalString(raw.region),
    description: toKnownOptionalString(raw.description),
    tastingNotes: toKnownOptionalString(raw.tastingNotes ?? raw.tasting_notes),
    foodPairings: toOptionalStringArray(raw.foodPairings ?? raw.food_pairings),
    riceVariety: toKnownOptionalString(raw.riceVariety ?? raw.rice_variety),
    polishingRatio: toOptionalNumber(raw.polishingRatio ?? raw.polishing_ratio),
    alcoholPercentage: toOptionalNumber(raw.alcoholPercentage ?? raw.alcohol_percentage),
    flavorProfile: toOptionalStringArray(raw.flavorProfile ?? raw.flavor_profile),
    servingTemperature: toOptionalStringArray(raw.servingTemperature ?? raw.serving_temperature),
  };
}

function getLabelQualityMetrics(extracted: ExtractedLabel): {
  confidenceScore: number;
  scanQualityHint: 'high' | 'medium' | 'low';
  qualityReasons: string[];
} {
  let score = 45;
  const reasons: string[] = [];

  if (extracted.type && extracted.type.toLowerCase() !== 'other') score += 8;
  if (extracted.prefecture || extracted.region) score += 8;
  if (extracted.nameJapanese) score += 5;
  if (extracted.tastingNotes) score += 8;
  if (extracted.foodPairings?.length) score += 8;
  if (extracted.flavorProfile?.length) score += 8;
  if (extracted.servingTemperature?.length) score += 5;
  if (extracted.polishingRatio) score += 5;
  if (extracted.alcoholPercentage) score += 5;
  if (extracted.riceVariety) score += 5;

  if (!extracted.flavorProfile?.length) reasons.push('No flavor profile detected');
  if (!extracted.tastingNotes) reasons.push('No tasting notes detected');
  if (!extracted.prefecture && !extracted.region) reasons.push('No region details detected');
  if (!extracted.polishingRatio && !extracted.alcoholPercentage) {
    reasons.push('No numeric specs detected');
  }

  const confidenceScore = Math.max(0, Math.min(100, score));
  const scanQualityHint =
    confidenceScore >= 75 ? 'high' : confidenceScore >= 55 ? 'medium' : 'low';

  return {
    confidenceScore,
    scanQualityHint,
    qualityReasons: reasons.slice(0, 2),
  };
}

function isWeakString(value: string | undefined): boolean {
  const v = value?.trim() ?? '';
  return (
    v.length === 0 ||
    v === 'No description available.' ||
    v.toLowerCase() === 'other' ||
    v.toLowerCase() === 'sake' ||
    v.toLowerCase() === 'unknown brewery'
  );
}

function mergeEnrichment(base: ExtractedLabel, fill: Partial<ExtractedLabel>): ExtractedLabel {
  return {
    ...base,
    nameJapanese: base.nameJapanese || fill.nameJapanese,
    type: !isWeakString(base.type) ? base.type : fill.type || base.type,
    subtype: base.subtype || fill.subtype,
    prefecture: base.prefecture || fill.prefecture,
    region: base.region || fill.region,
    description:
      !isWeakString(base.description) && (base.description?.length ?? 0) >= 40
        ? base.description
        : fill.description || base.description,
    tastingNotes: base.tastingNotes || fill.tastingNotes,
    foodPairings: base.foodPairings?.length ? base.foodPairings : fill.foodPairings,
    riceVariety: base.riceVariety || fill.riceVariety,
    polishingRatio: base.polishingRatio ?? fill.polishingRatio,
    alcoholPercentage: base.alcoholPercentage ?? fill.alcoholPercentage,
    flavorProfile: base.flavorProfile?.length ? base.flavorProfile : fill.flavorProfile,
    servingTemperature: base.servingTemperature?.length
      ? base.servingTemperature
      : fill.servingTemperature,
  };
}

function needsEnrichment(sake: ExtractedLabel): boolean {
  const desc = sake.description?.trim() ?? '';
  const weakDesc =
    desc.length < 40 ||
    desc === 'No description available.' ||
    desc.toLowerCase() === 'sake';
  return (
    weakDesc ||
    !sake.tastingNotes?.trim() ||
    !sake.flavorProfile?.length ||
    !sake.foodPairings?.length
  );
}

function escapeIlike(value: string): string {
  return value.replace(/[%_,]/g, '');
}

function scoreCatalogCandidate(
  row: SakeRow,
  query: {
    name: string;
    brewery: string;
    nameJapanese?: string;
    polishingRatio?: number;
    riceVariety?: string;
  },
  options?: {
    hasLabelImages?: boolean;
    rejectedSakeId?: string;
  },
): number {
  const n = row.name.toLowerCase();
  const b = row.brewery.toLowerCase();
  const gn = query.name.toLowerCase();
  const gb = query.brewery.toLowerCase();
  const rowJp = (row.name_japanese ?? '').toLowerCase();
  const queryJp = (query.nameJapanese ?? '').toLowerCase();

  let score = 0;

  if (n === gn) score += 100;
  else if (n.includes(gn) || gn.includes(n)) score += 50;

  if (b === gb) score += 40;
  else if (gb.length > 0 && (b.includes(gb) || gb.includes(b))) score += 20;

  if (queryJp && rowJp) {
    if (rowJp === queryJp) score += 45;
    else if (rowJp.includes(queryJp) || queryJp.includes(rowJp)) score += 25;
  }

  if (
    query.polishingRatio != null &&
    row.polishing_ratio != null &&
    Number.isFinite(row.polishing_ratio)
  ) {
    const delta = Math.abs(row.polishing_ratio - query.polishingRatio);
    if (delta <= 1) score += 30;
    else if (delta <= 5) score += 15;
  }

  if (query.riceVariety && row.rice_variety) {
    const qr = query.riceVariety.toLowerCase();
    const rr = row.rice_variety.toLowerCase();
    if (rr === qr || rr.includes(qr) || qr.includes(rr)) score += 20;
  }

  const gNums: string[] = gn.match(/\d+/g) ?? [];
  const nNums: string[] = n.match(/\d+/g) ?? [];
  if (gNums.length > 0 && gNums.some((x) => nNums.includes(x))) score += 25;

  // Tie-breakers: prefer richer catalog rows
  score += Math.min(row.total_ratings ?? 0, 15);
  if (row.image_url) score += 8;
  if (row.average_rating != null && row.average_rating > 0) score += 5;

  // Confirmed front/back label photos → stronger future matches without always relying on Vision
  if (options?.hasLabelImages) score += 35;

  // User explicitly rejected this bottle — demote hard unless Vision still points here clearly
  if (options?.rejectedSakeId && row.id === options.rejectedSakeId) {
    score -= 90;
  }

  return score;
}

function rankMatches(
  rows: SakeRow[],
  query: {
    name: string;
    brewery: string;
    nameJapanese?: string;
    polishingRatio?: number;
    riceVariety?: string;
  },
  options?: {
    labeledSakeIds?: Set<string>;
    rejectedSakeId?: string;
  },
): MatchCandidate[] {
  return rows
    .map((row) => {
      const hasLabelImages = options?.labeledSakeIds?.has(row.id) ?? false;
      return {
        id: row.id,
        name: row.name,
        brewery: row.brewery,
        name_japanese: row.name_japanese,
        type: row.type,
        image_url: row.image_url,
        polishing_ratio: row.polishing_ratio,
        average_rating: row.average_rating,
        total_ratings: row.total_ratings,
        has_label_images: hasLabelImages,
        score: scoreCatalogCandidate(row, query, {
          hasLabelImages,
          rejectedSakeId: options?.rejectedSakeId,
        }),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aRich =
        (a.image_url ? 1 : 0) + (a.total_ratings ?? 0) + (a.has_label_images ? 5 : 0);
      const bRich =
        (b.image_url ? 1 : 0) + (b.total_ratings ?? 0) + (b.has_label_images ? 5 : 0);
      return bRich - aRich;
    });
}

function buildLabelPrompt(
  hasBack: boolean,
  rejected?: RejectedBottle | null,
): string {
  const rejectLines: string[] = [];
  if (rejected?.name || rejected?.brewery || rejected?.sakeId) {
    rejectLines.push(
      '',
      'The user already rejected a previous match. Do NOT return that bottle unless the labels clearly prove it is correct:',
    );
    if (rejected.name) rejectLines.push(`- rejected name: ${rejected.name}`);
    if (rejected.brewery) rejectLines.push(`- rejected brewery: ${rejected.brewery}`);
    if (rejected.sakeId) rejectLines.push(`- rejected catalog id: ${rejected.sakeId}`);
  }

  if (hasBack) {
    return `You are reading sake bottle photos: image 1 is the FRONT label, image 2 is the BACK label.

Use both images together:
- Prefer brand / product name and Japanese name from the FRONT label
- Prefer brewery address, rice variety (原料米), polishing ratio / seimaibuai (精米歩合), SMV / nihonshudo, ABV, and product codes from the BACK label
- Prefer BACK-label specs when front and back conflict on numeric fields
- Omit fields you cannot determine (do not invent)
- Keep description concise (1-2 sentences)
- Return factual output only${rejectLines.join('\n')}`;
  }

  return `You are reading one sake bottle label photo.

Extract label information from visible text only:
- Include the primary sake name and brewery when visible
- Use type values like Junmai, Ginjo, Daiginjo, Honjozo, Nigori, Sparkling, Futsushu, Other
- Omit fields you cannot determine (do not invent)
- Keep description concise (1-2 sentences)
- Return factual output only${rejectLines.join('\n')}`;
}

async function callLabelVision(
  apiKey: string,
  frontBase64: string,
  backBase64: string | null,
  rejected: RejectedBottle | null,
  model: 'gpt-4o-mini' | 'gpt-4o',
): Promise<OpenAIChatResult> {
  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: buildLabelPrompt(Boolean(backBase64), rejected),
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${frontBase64}`,
      },
    },
  ];

  if (backBase64) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${backBase64}`,
      },
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      response_format: {
        type: 'json_schema',
        json_schema: LABEL_JSON_SCHEMA,
      },
      max_tokens: 1200,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[scan-label] OpenAI ${model} error:`, response.status, errorText.slice(0, 300));
    let message = `OpenAI API error: ${response.status}`;
    if (response.status === 401) message = 'OpenAI authentication failed on server.';
    if (response.status === 429) message = 'Rate limit exceeded. Please try again in a moment.';
    if (response.status === 402) message = 'OpenAI account has insufficient credits.';
    return { ok: false, status: response.status, message, model };
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const aiContent = choice?.message?.content;
  if (!aiContent || typeof aiContent !== 'string') {
    return { ok: false, status: 500, message: 'No analysis result from OpenAI', model };
  }
  return {
    ok: true,
    content: aiContent,
    finishReason: choice?.finish_reason,
    model,
  };
}

function isWeakExtract(extracted: ExtractedLabel | null): boolean {
  if (!extracted) return true;
  const quality = getLabelQualityMetrics(extracted);
  return (
    quality.confidenceScore < 55 ||
    (!extracted.polishingRatio && !extracted.alcoholPercentage && !extracted.riceVariety)
  );
}

async function enrichSakeFromName(
  apiKey: string,
  identified: ExtractedLabel,
): Promise<Partial<ExtractedLabel> | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `You are a sake sommelier. Given this identified bottle, return known product details as JSON.
Only include fields you are reasonably confident about for this specific sake. Do not invent fake polishing ratios or ABV if unknown — omit those fields.

Identified from label:
- name: ${identified.name}
- brewery: ${identified.brewery}
- type: ${identified.type ?? 'Unknown'}
${identified.nameJapanese ? `- nameJapanese: ${identified.nameJapanese}` : ''}
${identified.prefecture ? `- prefecture: ${identified.prefecture}` : ''}
${identified.polishingRatio != null ? `- polishingRatio: ${identified.polishingRatio}` : ''}

Return JSON with any of:
description (2-3 sentences), tastingNotes, foodPairings (string array), flavorProfile (string array),
servingTemperature (subset of Chilled/Room/Warm), riceVariety, prefecture, region, subtype,
alcoholPercentage (number), polishingRatio (number), nameJapanese.`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content.trim()) as Record<string, unknown>;
    return {
      nameJapanese: toKnownOptionalString(parsed.nameJapanese),
      type: toKnownOptionalString(parsed.type),
      subtype: toKnownOptionalString(parsed.subtype),
      prefecture: toKnownOptionalString(parsed.prefecture),
      region: toKnownOptionalString(parsed.region),
      description: toKnownOptionalString(parsed.description),
      tastingNotes: toKnownOptionalString(parsed.tastingNotes),
      foodPairings: toOptionalStringArray(parsed.foodPairings),
      riceVariety: toKnownOptionalString(parsed.riceVariety),
      polishingRatio: toOptionalNumber(parsed.polishingRatio),
      alcoholPercentage: toOptionalNumber(parsed.alcoholPercentage),
      flavorProfile: toOptionalStringArray(parsed.flavorProfile),
      servingTemperature: toOptionalStringArray(parsed.servingTemperature),
    };
  } catch {
    return null;
  }
}

function parseRejected(raw: unknown): RejectedBottle | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const sakeId = toOptionalString(obj.sakeId ?? obj.sake_id);
  const name = toKnownOptionalString(obj.name);
  const brewery = toKnownOptionalString(obj.brewery);
  if (!sakeId && !name && !brewery) return null;
  return { sakeId, name, brewery };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const image_base64 = body?.image_base64;
    const back_image_base64 =
      typeof body?.back_image_base64 === 'string' && body.back_image_base64.length > 0
        ? body.back_image_base64
        : null;
    const rejected = parseRejected(body?.rejected);
    const usedBackLabel = Boolean(back_image_base64);

    if (!image_base64 || typeof image_base64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Vision — factual label extraction (mini first; escalate like menu scan)
    let vision = await callLabelVision(
      openaiApiKey,
      image_base64,
      back_image_base64,
      rejected,
      'gpt-4o-mini',
    );

    let extracted: ExtractedLabel | null = null;
    if (vision.ok && vision.finishReason !== 'length') {
      try {
        extracted = normalizeExtracted(JSON.parse(vision.content.trim()) as Record<string, unknown>);
      } catch {
        extracted = null;
      }
    }

    const shouldEscalate =
      !vision.ok ||
      vision.finishReason === 'length' ||
      !extracted ||
      (usedBackLabel && isWeakExtract(extracted));

    if (shouldEscalate) {
      console.log(
        `[scan-label] escalating to gpt-4o (mini ok=${vision.ok} usedBack=${usedBackLabel} weak=${isWeakExtract(extracted)})`,
      );
      const fallback = await callLabelVision(
        openaiApiKey,
        image_base64,
        back_image_base64,
        rejected,
        'gpt-4o',
      );
      if (fallback.ok) {
        vision = fallback;
        try {
          extracted = normalizeExtracted(
            JSON.parse(fallback.content.trim()) as Record<string, unknown>,
          );
        } catch {
          extracted = null;
        }
      } else if (!vision.ok) {
        return new Response(
          JSON.stringify({ success: false, message: fallback.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (!vision.ok && !extracted) {
      return new Response(
        JSON.stringify({ success: false, message: vision.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (vision.ok && vision.finishReason === 'length' && !extracted) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'This label photo has too much text to parse in one pass. Move closer and focus on the bottle label.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!extracted) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Could not identify sake information. Please make sure the label is clearly visible.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Cheap path: prior confirmed correction for this rejected bottle → reuse corrected sake_id
    let priorCorrectedId: string | null = null;
    if (rejected?.sakeId || rejected?.name) {
      let feedbackQuery = supabase
        .from('scan_feedback')
        .select('corrected_sake_id')
        .eq('kind', 'wrong')
        .not('corrected_sake_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (rejected.sakeId) {
        feedbackQuery = feedbackQuery.eq('sake_id', rejected.sakeId);
      } else if (rejected.name) {
        feedbackQuery = feedbackQuery.ilike('name', rejected.name);
      }

      const { data: priorRows } = await feedbackQuery;
      priorCorrectedId = priorRows?.[0]?.corrected_sake_id ?? null;
    }

    // Step 2: Catalog entity resolution (name + brewery + Japanese + polishing + rice)
    const safeName = escapeIlike(extracted.name);
    const token = escapeIlike(extracted.name.split(/\s+/)[0] ?? extracted.name);
    const safeJp = escapeIlike(extracted.nameJapanese ?? '');
    const orParts = [
      `name.ilike.%${safeName}%`,
      `name.ilike.%${token}%`,
      `name_japanese.ilike.%${safeName}%`,
    ];
    if (safeJp) orParts.push(`name_japanese.ilike.%${safeJp}%`);

    const { data: matchRows, error: searchError } = await supabase
      .from('sake')
      .select('*')
      .or(orParts.join(','))
      .order('total_ratings', { ascending: false })
      .limit(20);

    if (searchError) {
      console.error('Catalog search error:', searchError.message);
    }

    const rows = (matchRows as SakeRow[]) ?? [];
    const rowIds = rows.map((r) => r.id);

    // Prefer catalog rows that already have confirmed label images
    const labeledSakeIds = new Set<string>();
    if (rowIds.length > 0) {
      const { data: labelRows } = await supabase
        .from('sake_label_images')
        .select('sake_id')
        .in('sake_id', rowIds);
      for (const row of labelRows ?? []) {
        if (row?.sake_id) labeledSakeIds.add(row.sake_id as string);
      }
    }

    const ranked = rankMatches(
      rows,
      {
        name: extracted.name,
        brewery: extracted.brewery,
        nameJapanese: extracted.nameJapanese,
        polishingRatio: extracted.polishingRatio,
        riceVariety: extracted.riceVariety,
      },
      {
        labeledSakeIds,
        rejectedSakeId: rejected?.sakeId,
      },
    );

    // If a prior correction exists and still ranks reasonably, prefer it
    if (priorCorrectedId) {
      const priorIdx = ranked.findIndex((c) => c.id === priorCorrectedId);
      if (priorIdx >= 0 && ranked[priorIdx].score >= 40) {
        ranked[priorIdx].score += 50;
        ranked.sort((a, b) => b.score - a.score);
      } else if (priorIdx < 0) {
        // Pull the prior corrected sake into candidates even if name search missed it
        const { data: priorSake } = await supabase
          .from('sake')
          .select('*')
          .eq('id', priorCorrectedId)
          .maybeSingle();
        if (priorSake) {
          const priorRow = priorSake as SakeRow;
          ranked.unshift({
            id: priorRow.id,
            name: priorRow.name,
            brewery: priorRow.brewery,
            name_japanese: priorRow.name_japanese,
            type: priorRow.type,
            image_url: priorRow.image_url,
            polishing_ratio: priorRow.polishing_ratio,
            average_rating: priorRow.average_rating,
            total_ratings: priorRow.total_ratings,
            has_label_images: true,
            score: 120,
          });
          rows.push(priorRow);
        }
      }
    }

    const MATCH_THRESHOLD = 55;
    const CLOSE_SCORE_GAP = 18;
    const viable = ranked.filter((c) => c.score >= MATCH_THRESHOLD);
    const top = viable[0] ?? null;
    const closeSeconds = top
      ? viable.filter((c) => c.id !== top.id && top.score - c.score <= CLOSE_SCORE_GAP).slice(0, 2)
      : [];
    const ambiguous = closeSeconds.length > 0;
    const candidates = top
      ? [top, ...closeSeconds].slice(0, 3)
      : ranked.filter((c) => c.score >= 40).slice(0, 3);

    let matchedSake: SakeRow | null = null;
    if (top) {
      matchedSake = rows.find((r) => r.id === top.id) ?? null;
    }

    // Never auto-match the rejected bottle on a correction pass
    if (
      usedBackLabel &&
      rejected?.sakeId &&
      matchedSake?.id === rejected.sakeId &&
      (top?.score ?? 0) < 140
    ) {
      matchedSake = null;
    }

    // Step 3: Enrichment when narrative fields are thin
    let enrichment: Partial<ExtractedLabel> | null = null;
    let merged = extracted;
    if (needsEnrichment(extracted)) {
      enrichment = await enrichSakeFromName(openaiApiKey, extracted);
      if (enrichment) {
        merged = mergeEnrichment(extracted, enrichment);
      }
    }

    const quality = getLabelQualityMetrics(merged);

    return new Response(
      JSON.stringify({
        success: true,
        extracted: merged,
        enrichment: enrichment ?? null,
        matched_sake: matchedSake,
        sakeId: matchedSake?.id ?? null,
        candidates: ambiguous || !matchedSake ? candidates : [],
        confidence: quality.confidenceScore,
        scanQualityHint: quality.scanQualityHint,
        qualityReasons: quality.qualityReasons,
        ambiguous,
        used_back_label: usedBackLabel,
        model: vision.ok ? vision.model : 'gpt-4o',
        message: matchedSake
          ? ambiguous
            ? 'Close catalog matches found — confirm the correct bottle'
            : 'Match found in database'
          : 'No confident catalog match',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in scan-label function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
