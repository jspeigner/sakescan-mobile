export interface SakeInfo {
  name: string;
  nameJapanese?: string;
  brewery: string;
  type: string;
  subtype?: string;
  prefecture?: string;
  region?: string;
  description: string;
  tastingNotes?: string;
  foodPairings?: string[];
  riceVariety?: string;
  polishingRatio?: number;
  alcoholPercentage?: number;
  flavorProfile?: string[];
  servingTemperature?: string[];
  confidenceScore?: number;
  scanQualityHint?: 'high' | 'medium' | 'low';
  qualityReasons?: string[];
}

export interface ScanResult {
  success: boolean;
  sake?: SakeInfo;
  error?: string;
}

export interface MenuSakeItem {
  name: string;
  nameJapanese?: string;
  brewery?: string;
  type?: string;
  price?: string;
  size?: string;
  description?: string;
  flavorProfile?: string[];
  servingTemperature?: string[];
  alcoholPercentage?: number;
  polishingRatio?: number;
}

export interface MenuScanResult {
  success: boolean;
  sakes?: MenuSakeItem[];
  error?: string;
}

interface RawMenuSakeItem {
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

interface RawLabelSakeInfo {
  name?: unknown;
  nameJapanese?: unknown;
  brewery?: unknown;
  type?: unknown;
  subtype?: unknown;
  prefecture?: unknown;
  region?: unknown;
  description?: unknown;
  tastingNotes?: unknown;
  foodPairings?: unknown;
  riceVariety?: unknown;
  polishingRatio?: unknown;
  alcoholPercentage?: unknown;
  flavorProfile?: unknown;
  servingTemperature?: unknown;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNumber(value: unknown, minExclusive?: number): number | undefined {
  const isAllowed = (num: number) =>
    minExclusive == null ? Number.isFinite(num) : Number.isFinite(num) && num > minExclusive;

  if (typeof value === 'number' && isAllowed(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (isAllowed(parsed)) return parsed;
  }
  return undefined;
}

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => toOptionalString(item))
    .filter((item): item is string => Boolean(item));
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeMenuSakeItem(item: RawMenuSakeItem): MenuSakeItem | null {
  const name = toKnownOptionalString(item.name);
  if (!name) return null;

  return {
    name,
    nameJapanese: toKnownOptionalString(item.nameJapanese),
    brewery: toKnownOptionalString(item.brewery),
    type: toKnownOptionalString(item.type),
    price: toKnownOptionalString(item.price),
    size: toKnownOptionalString(item.size),
    description: toKnownOptionalString(item.description),
    flavorProfile: toOptionalStringArray(item.flavorProfile),
    servingTemperature: toOptionalStringArray(item.servingTemperature),
    alcoholPercentage: toOptionalNumber(item.alcoholPercentage, 0),
    polishingRatio: toOptionalNumber(item.polishingRatio, 0),
  };
}

function dedupeMenuSakes(items: MenuSakeItem[]): MenuSakeItem[] {
  const seen = new Set<string>();
  const deduped: MenuSakeItem[] = [];
  for (const item of items) {
    const key = [
      item.name.toLowerCase(),
      (item.price ?? '').toLowerCase(),
      (item.size ?? '').toLowerCase(),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function isLikelyMenuItem(value: unknown): value is RawMenuSakeItem {
  return isRecord(value) && typeof value.name === 'string';
}

function findMenuItemsInUnknown(value: unknown, depth = 0): RawMenuSakeItem[] {
  if (depth > 6) return [];

  if (Array.isArray(value)) {
    if (value.every((item) => isLikelyMenuItem(item))) {
      return value;
    }
    for (const item of value) {
      const nested = findMenuItemsInUnknown(item, depth + 1);
      if (nested.length > 0) return nested;
    }
    return [];
  }

  if (!isRecord(value)) return [];

  if (Array.isArray(value.sakes)) {
    return value.sakes.filter((item): item is RawMenuSakeItem => isLikelyMenuItem(item));
  }

  for (const nestedValue of Object.values(value)) {
    const nested = findMenuItemsInUnknown(nestedValue, depth + 1);
    if (nested.length > 0) return nested;
  }

  return [];
}

function findLabelInfoInUnknown(value: unknown, depth = 0): RawLabelSakeInfo | null {
  if (depth > 6) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findLabelInfoInUnknown(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  if (typeof value.name === 'string' && typeof value.brewery === 'string') {
    return value as RawLabelSakeInfo;
  }

  for (const nestedValue of Object.values(value)) {
    const nested = findLabelInfoInUnknown(nestedValue, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function normalizeLabelSakeInfo(item: RawLabelSakeInfo): SakeInfo | null {
  const name = toKnownOptionalString(item.name);
  const brewery = toKnownOptionalString(item.brewery);
  if (!name || !brewery) {
    return null;
  }

  const type = toKnownOptionalString(item.type);
  const description = toKnownOptionalString(item.description);

  return {
    name,
    brewery,
    type: type ?? 'Other',
    description: description ?? 'No description available.',
    nameJapanese: toKnownOptionalString(item.nameJapanese),
    subtype: toKnownOptionalString(item.subtype),
    prefecture: toKnownOptionalString(item.prefecture),
    region: toKnownOptionalString(item.region),
    tastingNotes: toKnownOptionalString(item.tastingNotes),
    foodPairings: toOptionalStringArray(item.foodPairings),
    riceVariety: toKnownOptionalString(item.riceVariety),
    polishingRatio: toOptionalNumber(item.polishingRatio, 0),
    alcoholPercentage: toOptionalNumber(item.alcoholPercentage, 0),
    flavorProfile: toOptionalStringArray(item.flavorProfile),
    servingTemperature: toOptionalStringArray(item.servingTemperature),
  };
}

function getLabelQualityMetrics(sakeInfo: SakeInfo): {
  confidenceScore: number;
  scanQualityHint: 'high' | 'medium' | 'low';
  qualityReasons: string[];
} {
  let score = 45; // name + brewery baseline
  const reasons: string[] = [];

  if (sakeInfo.type && sakeInfo.type !== 'Other') score += 8;
  if (sakeInfo.prefecture || sakeInfo.region) score += 8;
  if (sakeInfo.nameJapanese) score += 5;
  if (sakeInfo.tastingNotes) score += 8;
  if (sakeInfo.foodPairings?.length) score += 8;
  if (sakeInfo.flavorProfile?.length) score += 8;
  if (sakeInfo.servingTemperature?.length) score += 5;
  if (sakeInfo.polishingRatio) score += 5;
  if (sakeInfo.alcoholPercentage) score += 5;

  if (!sakeInfo.flavorProfile?.length) reasons.push('No flavor profile detected');
  if (!sakeInfo.tastingNotes) reasons.push('No tasting notes detected');
  if (!sakeInfo.prefecture && !sakeInfo.region) reasons.push('No region details detected');
  if (!sakeInfo.polishingRatio && !sakeInfo.alcoholPercentage) reasons.push('No numeric specs detected');

  const confidenceScore = Math.max(0, Math.min(100, score));
  const scanQualityHint =
    confidenceScore >= 75 ? 'high' : confidenceScore >= 55 ? 'medium' : 'low';

  return {
    confidenceScore,
    scanQualityHint,
    qualityReasons: reasons.slice(0, 2),
  };
}

export async function scanSakeLabel(imageBase64: string): Promise<ScanResult> {
  try {
    const apiKey =
      process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ||
      process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY?.trim();

    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      return {
        success: false,
        error:
          'API key not configured. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file (legacy: EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY).',
      };
    }

    console.log('🔍 Analyzing sake label with OpenAI Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are reading one sake bottle label photo.

Extract label information from visible text only:
- Include the primary sake name and brewery when visible
- Use type values like Junmai, Ginjo, Daiginjo, Honjozo, Nigori, Sparkling, Futsushu, Other
- Omit fields you cannot determine (do not invent)
- Keep description concise (1-2 sentences)
- Return factual output only`,
              },
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
          json_schema: {
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
          },
        },
        max_tokens: 1200,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key. Please check your OpenAI API key configuration.'
        };
      } else if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.'
        };
      } else if (response.status === 402) {
        return {
          success: false,
          error: 'OpenAI account has insufficient credits. Please add credits at platform.openai.com.'
        };
      }

      return {
        success: false,
        error: `OpenAI API error: ${response.status}`
      };
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', data);
      return {
        success: false,
        error: 'No analysis result from OpenAI'
      };
    }

    if (choice?.finish_reason === 'length') {
      return {
        success: false,
        error: 'This label photo has too much text to parse in one pass. Move closer and focus on the bottle label.',
      };
    }

    let rawInfo: RawLabelSakeInfo | null = null;
    try {
      const parsed = JSON.parse(content.trim()) as unknown;
      rawInfo = findLabelInfoInUnknown(parsed);
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      return {
        success: false,
        error: 'Failed to parse AI analysis. The image might not be a sake label.'
      };
    }

    if (!rawInfo) {
      return {
        success: false,
        error: 'Could not identify sake information. Please make sure the label is clearly visible.'
      };
    }

    const normalized = normalizeLabelSakeInfo(rawInfo);
    const quality = normalized ? getLabelQualityMetrics(normalized) : null;
    const sakeInfo = normalized
      ? {
          ...normalized,
          ...quality,
        }
      : null;
    if (!sakeInfo) {
      return {
        success: false,
        error: 'Could not identify sake information. Please make sure the label is clearly visible.'
      };
    }

    console.log('✅ Successfully analyzed sake:', sakeInfo.name);

    return {
      success: true,
      sake: sakeInfo
    };

  } catch (error: any) {
    console.error('Error scanning sake label:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze label. Please check your internet connection.'
    };
  }
}

export async function scanSakeMenu(imageBase64: string): Promise<MenuScanResult> {
  try {
    const apiKey =
      process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ||
      process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return {
        success: false,
        error: 'API key not configured. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.',
      };
    }

    console.log('📋 Analyzing sake menu with OpenAI Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  url: `data:image/jpeg;base64,${imageBase64}`,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      if (response.status === 401) {
        return { success: false, error: 'Invalid API key.' };
      } else if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again in a moment.' };
      } else if (response.status === 402) {
        return { success: false, error: 'OpenAI account has insufficient credits.' };
      }

      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    if (!content) {
      return { success: false, error: 'No analysis result from OpenAI' };
    }

    if (choice?.finish_reason === 'length') {
      return {
        success: false,
        error:
          'This menu photo has too much text for one pass. Try scanning one menu section at a time.',
      };
    }

    let rawItems: RawMenuSakeItem[] = [];
    try {
      const parsed = JSON.parse(content.trim()) as unknown;
      rawItems = findMenuItemsInUnknown(parsed);
    } catch (error) {
      console.error('Failed to parse menu response:', content);
      return {
        success: false,
        error: 'Failed to parse menu. Make sure the menu is clearly visible.',
      };
    }

    const normalized = rawItems
      .map((item) => normalizeMenuSakeItem(item))
      .filter((item): item is MenuSakeItem => Boolean(item));
    const sakes = dedupeMenuSakes(normalized);

    if (sakes.length === 0) {
      return {
        success: false,
        error:
          'No sake items found on this menu. Try better lighting or scan a smaller section of the menu.',
      };
    }

    console.log(`✅ Found ${sakes.length} sake items on menu`);

    return { success: true, sakes };
  } catch (error: any) {
    console.error('Error scanning sake menu:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze menu. Check your internet connection.',
    };
  }
}
