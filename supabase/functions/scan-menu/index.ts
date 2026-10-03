/**
 * Sake menu Vision extract — OpenAI key stays server-side (OPENAI_API_KEY secret).
 * Default model: gpt-4o-mini; falls back to gpt-4o when mini returns nothing usable.
 * Requires a valid user JWT (menu scan is authenticated in the app).
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MENU_PROMPT = `You are reading a restaurant sake menu photo. Extract EVERY sake listed.

Output must be compact and strictly factual from visible text:
- Include all listed items
- Keep each price exactly as shown (including symbols if present)
- Include size labels if visible (Small, Large, One Size, glass, carafe, bottle, ml)
- If one sake has multiple listed prices/sizes, output one item per size/price row
- Do NOT invent missing fields
- Keep descriptions short (max 10 words) and only when clearly inferable from type
`;

const MENU_JSON_SCHEMA = {
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
} as const;

type OpenAIChatResult =
  | { ok: true; content: string; finishReason?: string; model: string }
  | { ok: false; status: number; message: string; model: string };

async function callMenuVision(
  apiKey: string,
  imageBase64: string,
  model: 'gpt-4o-mini' | 'gpt-4o',
): Promise<OpenAIChatResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: MENU_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: MENU_JSON_SCHEMA,
      },
      max_tokens: 5000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[scan-menu] OpenAI ${model} error:`, response.status, errorText.slice(0, 300));
    let message = `OpenAI API error: ${response.status}`;
    if (response.status === 401) message = 'OpenAI authentication failed on server.';
    if (response.status === 429) message = 'Rate limit exceeded. Please try again in a moment.';
    if (response.status === 402) message = 'OpenAI account has insufficient credits.';
    return { ok: false, status: response.status, message, model };
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content || typeof content !== 'string') {
    return { ok: false, status: 500, message: 'No analysis result from OpenAI', model };
  }
  return {
    ok: true,
    content,
    finishReason: choice?.finish_reason,
    model,
  };
}

function countSakesInContent(content: string): number {
  try {
    const parsed = JSON.parse(content.trim()) as { sakes?: unknown };
    return Array.isArray(parsed?.sakes) ? parsed.sakes.length : 0;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Authentication required for menu scan.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'OpenAI API key not configured on server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify JWT via Auth API (anon key + user bearer). Blocks anonymous abuse of Vision spend.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_PUBLISHABLE_KEY') ?? '';
    if (supabaseUrl && anonKey) {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: authHeader,
          apikey: anonKey,
        },
      });
      if (!userRes.ok) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid or expired session. Sign in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const body = await req.json();
    const imageBase64 = body?.image_base64;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Cost path: mini first, escalate to 4o if empty / failed parse
    let result = await callMenuVision(openaiApiKey, imageBase64, 'gpt-4o-mini');
    if (result.ok && result.finishReason === 'length') {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'This menu photo has too much text for one pass. Try scanning one menu section at a time.',
          model: result.model,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const miniCount = result.ok ? countSakesInContent(result.content) : 0;
    if (!result.ok || miniCount === 0) {
      console.log(
        `[scan-menu] escalating to gpt-4o (mini ok=${result.ok} count=${miniCount})`,
      );
      const fallback = await callMenuVision(openaiApiKey, imageBase64, 'gpt-4o');
      if (fallback.ok) {
        result = fallback;
      } else if (!result.ok) {
        return new Response(
          JSON.stringify({ success: false, message: fallback.message, model: fallback.model }),
          {
            status: fallback.status === 429 ? 429 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    if (!result.ok) {
      return new Response(
        JSON.stringify({ success: false, message: result.message, model: result.model }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (result.finishReason === 'length') {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'This menu photo has too much text for one pass. Try scanning one menu section at a time.',
          model: result.model,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sakes: unknown[] = [];
    try {
      const parsed = JSON.parse(result.content.trim()) as { sakes?: unknown };
      sakes = Array.isArray(parsed?.sakes) ? parsed.sakes : [];
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to parse menu. Make sure the menu is clearly visible.',
          model: result.model,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (sakes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'No sake items found on this menu. Try better lighting or scan a smaller section of the menu.',
          model: result.model,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sakes,
        model: result.model,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[scan-menu] unhandled:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Menu scan failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
