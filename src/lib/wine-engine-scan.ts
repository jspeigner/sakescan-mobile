import { supabase } from './supabase';
import type { ScanResult, SakeInfo } from './openai-scan';

interface PartialSake {
  name?: string;
  nameJapanese?: string;
  brewery?: string;
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

interface ScanLabelV2Response {
  success: boolean;
  provider?: 'wineengine' | 'openai' | 'wineengine+openai' | 'none';
  confidence?: 'high' | 'medium' | 'low';
  matched_sake_id?: string | null;
  sake?: PartialSake;
  wineengine?: { score?: number; match_percent?: number };
  total_latency_ms?: number;
  error?: string;
}

function normalizeSake(partial: PartialSake, confidence?: 'high' | 'medium' | 'low'): SakeInfo {
  return {
    name: partial.name?.trim() || 'Unknown sake',
    nameJapanese: partial.nameJapanese?.trim() || undefined,
    brewery: partial.brewery?.trim() || 'Unknown brewery',
    type: partial.type?.trim() || 'Sake',
    subtype: partial.subtype?.trim() || undefined,
    prefecture: partial.prefecture?.trim() || undefined,
    region: partial.region?.trim() || undefined,
    description: partial.description?.trim() || '',
    tastingNotes: partial.tastingNotes?.trim() || undefined,
    foodPairings: Array.isArray(partial.foodPairings) ? partial.foodPairings : undefined,
    riceVariety: partial.riceVariety?.trim() || undefined,
    polishingRatio:
      typeof partial.polishingRatio === 'number' && Number.isFinite(partial.polishingRatio)
        ? partial.polishingRatio
        : undefined,
    alcoholPercentage:
      typeof partial.alcoholPercentage === 'number' && Number.isFinite(partial.alcoholPercentage)
        ? partial.alcoholPercentage
        : undefined,
    flavorProfile: Array.isArray(partial.flavorProfile) ? partial.flavorProfile : undefined,
    servingTemperature: Array.isArray(partial.servingTemperature)
      ? partial.servingTemperature
      : undefined,
    scanQualityHint: confidence,
  };
}

/**
 * Calls the scan-label-v2 Supabase Edge Function which runs:
 *   1. TinEye WineEngine reverse-image search against the `sakescan` collection
 *   2. OpenAI Vision fallback if WineEngine misses or scores below the confidence gate
 *
 * Returns the same ScanResult shape as `scanSakeLabel` so [`src/app/camera.tsx`]
 * can swap providers via a feature flag without restructuring the success path.
 */
export async function scanSakeLabelV2(imageBase64: string): Promise<ScanResult> {
  try {
    const { data, error } = await supabase.functions.invoke('scan-label-v2', {
      body: { image_base64: imageBase64 },
    });

    if (error) {
      console.error('scan-label-v2 invoke error:', error);
      return {
        success: false,
        error: error.message ?? 'Failed to invoke scan-label-v2',
      };
    }

    const payload = data as ScanLabelV2Response | null;
    if (!payload || !payload.success || !payload.sake) {
      return {
        success: false,
        error: payload?.error ?? 'Could not identify sake label',
      };
    }

    if (payload.provider) {
      console.log(
        `🍶 scan-label-v2 result: provider=${payload.provider}` +
          (payload.confidence ? ` confidence=${payload.confidence}` : '') +
          (payload.wineengine?.score != null
            ? ` we_score=${payload.wineengine.score}`
            : '') +
          (payload.total_latency_ms != null
            ? ` total=${payload.total_latency_ms}ms`
            : ''),
      );
    }

    return {
      success: true,
      sake: normalizeSake(payload.sake, payload.confidence),
    };
  } catch (err) {
    console.error('scan-label-v2 unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to invoke scan-label-v2',
    };
  }
}

/** True when the WineEngine cascade is enabled via env flag. */
export function isWineEngineEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_WINE_ENGINE_ENABLED?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}
