import type { Sake } from './database.types';

/** Shape used by ScanResultScreen after a label scan. */
export interface ScanDisplaySake {
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

function parseRichDescription(raw: string | null): {
  mainDescription: string;
  tastingNotes: string | null;
  foodPairings: string[];
  flavorProfile: string[];
  servingTemperature: string[];
} {
  const desc = raw?.trim() ?? '';
  if (!desc) {
    return {
      mainDescription: '',
      tastingNotes: null,
      foodPairings: [],
      flavorProfile: [],
      servingTemperature: [],
    };
  }

  const descParts = desc.split(/\n\n\*\*/);
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
    tastingNotes: extractField('Tasting Notes'),
    foodPairings: foodPairingsRaw ? foodPairingsRaw.split(', ').filter(Boolean) : [],
    flavorProfile: flavorProfileRaw ? flavorProfileRaw.split(', ').filter(Boolean) : [],
    servingTemperature: servingTempsRaw ? servingTempsRaw.split(', ').filter(Boolean) : [],
  };
}

/** Map a Supabase `sake` row to the scan result UI model (full catalog details). */
export function catalogSakeToScanInfo(row: Sake): ScanDisplaySake {
  const rich = parseRichDescription(row.description);
  const description =
    rich.mainDescription.length > 0 ? rich.mainDescription : (row.description?.trim() ?? '');

  return {
    name: row.name,
    nameJapanese: row.name_japanese ?? undefined,
    brewery: row.brewery,
    type: row.type?.trim() || 'Sake',
    subtype: row.subtype ?? undefined,
    prefecture: row.prefecture ?? undefined,
    region: row.region ?? undefined,
    description,
    tastingNotes: rich.tastingNotes ?? undefined,
    foodPairings: rich.foodPairings.length > 0 ? rich.foodPairings : undefined,
    riceVariety: row.rice_variety ?? undefined,
    polishingRatio:
      typeof row.polishing_ratio === 'number' && Number.isFinite(row.polishing_ratio)
        ? row.polishing_ratio
        : undefined,
    alcoholPercentage:
      typeof row.alcohol_percentage === 'number' && Number.isFinite(row.alcohol_percentage)
        ? row.alcohol_percentage
        : undefined,
    flavorProfile: rich.flavorProfile.length > 0 ? rich.flavorProfile : undefined,
    servingTemperature: rich.servingTemperature.length > 0 ? rich.servingTemperature : undefined,
    scanQualityHint: 'high',
  };
}
