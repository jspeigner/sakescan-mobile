const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RawMenuItem {
  name?: unknown;
  nameJapanese?: unknown;
  brewery?: unknown;
  type?: unknown;
  price?: unknown;
  size?: unknown;
  description?: unknown;
  flavorProfile?: unknown;
  servingTemperature?: unknown;
  alcoholPercentage?: unknown;
  polishingRatio?: unknown;
}

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

function normalizeMenuItem(raw: RawMenuItem): Record<string, unknown> | null {
  const name = toKnownOptionalString(raw.name);
  if (!name) return null;

  const item: Record<string, unknown> = { name };
  const nameJapanese = toKnownOptionalString(raw.nameJapanese);
  const brewery = toKnownOptionalString(raw.brewery);
  const type = toKnownOptionalString(raw.type);
  const price = toKnownOptionalString(raw.price);
  const size = toKnownOptionalString(raw.size);
  const description = toKnownOptionalString(raw.description);
  const flavorProfile = toOptionalStringArray(raw.flavorProfile);
  const servingTemperature = toOptionalStringArray(raw.servingTemperature);
  const alcoholPercentage = toOptionalNumber(raw.alcoholPercentage);
  const polishingRatio = toOptionalNumber(raw.polishingRatio);

  if (nameJapanese) item.nameJapanese = nameJapanese;
  if (brewery) item.brewery = brewery;
  if (type) item.type = type;
  if (price) item.price = price;
  if (size) item.size = size;
  if (description) item.description = description;
  if (flavorProfile) item.flavorProfile = flavorProfile;
  if (servingTemperature) item.servingTemperature = servingTemperature;
  if (alcoholPercentage != null) item.alcoholPercentage = alcoholPercentage;
  if (polishingRatio != null) item.polishingRatio = polishingRatio;
  return item;
}

function findMenuItemsInUnknown(value: unknown, depth = 0): RawMenuItem[] {
  if (depth > 4 || value == null) return [];
  if (Array.isArray(value)) {
    const out: RawMenuItem[] = [];
    for (const item of value) {
      if (item && typeof item === 'object' && 'name' in (item as object)) {
        out.push(item as RawMenuItem);
      } else {
        out.push(...findMenuItemsInUnknown(item, depth + 1));
      }
    }
    return out;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['sakes', 'items', 'menu', 'results']) {
      if (key in obj) {
        const nested = findMenuItemsInUnknown(obj[key], depth + 1);
        if (nested.length > 0) return nested;
      }
    }
    if ('name' in obj) return [obj as RawMenuItem];
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64 || typeof image_base64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are reading a restaurant sake menu photo. Extract EVERY sake listed.

Output must be compact and strictly factual from visible text:
- Include all listed items
- Keep each price exactly as shown (including symbols if present)
- Include size labels if visible (Small, Large, One Size, glass, carafe, bottle, ml)
- If one sake has multiple listed prices/sizes, output one item per size/price row
- Do NOT invent missing fields
- Keep descriptions short (max 10 words) and only when clearly inferable from type
`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'menu_sake_items',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sakes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      name: { type: 'string' },
                      nameJapanese: { type: 'string' },
                      brewery: { type: 'string' },
                      type: { type: 'string' },
                      price: { type: 'string' },
                      size: { type: 'string' },
                      description: { type: 'string' },
                      flavorProfile: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      servingTemperature: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      alcoholPercentage: { type: 'number' },
                      polishingRatio: { type: 'number' },
                    },
                    required: ['name'],
                  },
                },
              },
              required: ['sakes'],
            },
          },
        },
        max_tokens: 5000,
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI Vision error:', error.slice(0, 300));
      const status = openaiResponse.status;
      let message = 'Failed to analyze menu with OpenAI';
      if (status === 429) message = 'Rate limit exceeded. Please try again in a moment.';
      if (status === 401) message = 'OpenAI authentication failed on server.';
      if (status === 402) message = 'OpenAI account has insufficient credits.';
      return new Response(
        JSON.stringify({ success: false, message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const openaiData = await openaiResponse.json();
    const choice = openaiData.choices?.[0];
    const aiContent = choice?.message?.content;

    if (!aiContent) {
      return new Response(
        JSON.stringify({ success: false, message: 'No analysis result from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (choice?.finish_reason === 'length') {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'This menu photo has too much text for one pass. Try scanning one menu section at a time.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let rawItems: RawMenuItem[] = [];
    try {
      const parsed = JSON.parse(aiContent.trim()) as unknown;
      rawItems = findMenuItemsInUnknown(parsed);
    } catch {
      console.error('Failed to parse menu response');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to parse menu. Make sure the menu is clearly visible.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sakes = rawItems
      .map((item) => normalizeMenuItem(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));

    if (sakes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'No sake items found on this menu. Try better lighting or scan a smaller section of the menu.',
          sakes: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sakes,
        message: `Found ${sakes.length} sake items`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in scan-menu function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
