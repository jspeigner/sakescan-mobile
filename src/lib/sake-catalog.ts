import type { Sake } from './database.types';
import { supabase } from './supabase';

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

export interface CatalogMatchCandidate {
  id: string;
  name: string;
  brewery: string;
  nameJapanese?: string;
  type?: string;
  imageUrl?: string;
  polishingRatio?: number;
  score: number;
}

export interface CatalogMatchResult {
  id: string;
  sake: ScanDisplaySake;
  score: number;
  ambiguous: boolean;
  candidates: CatalogMatchCandidate[];
  /** Present for menu scoring / display when catalog has ratings. */
  averageRating?: number | null;
}

export interface CatalogMatchQuery {
  name: string;
  brewery: string;
  nameJapanese?: string;
  polishingRatio?: number;
}

function nonEmptyStrings(values: string[] | null | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

export function parseRichDescription(raw: string | null): {
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

/** Prefer structured columns; fall back to description markdown parsing. */
export function resolveSakeTastingFields(row: Sake): {
  mainDescription: string;
  tastingNotes?: string;
  foodPairings: string[];
  flavorProfile: string[];
  servingTemperature: string[];
} {
  const rich = parseRichDescription(row.description);
  const structuredTags = nonEmptyStrings(row.flavor_tags);
  const structuredPairings = nonEmptyStrings(row.food_pairings);
  const structuredTemps = nonEmptyStrings(row.serving_temps);
  const structuredNotes = row.tasting_notes?.trim() || null;

  const mainDescription =
    rich.mainDescription.length > 0
      ? rich.mainDescription
      : (row.description?.trim() ?? '');

  return {
    mainDescription,
    tastingNotes: structuredNotes ?? rich.tastingNotes ?? undefined,
    foodPairings: structuredPairings.length > 0 ? structuredPairings : rich.foodPairings,
    flavorProfile: structuredTags.length > 0 ? structuredTags : rich.flavorProfile,
    servingTemperature: structuredTemps.length > 0 ? structuredTemps : rich.servingTemperature,
  };
}

/** Map a Supabase `sake` row to the scan result UI model (full catalog details). */
export function catalogSakeToScanInfo(row: Sake): ScanDisplaySake {
  const tasting = resolveSakeTastingFields(row);

  return {
    name: row.name,
    nameJapanese: row.name_japanese ?? undefined,
    brewery: row.brewery,
    type: row.type?.trim() || 'Sake',
    subtype: row.subtype ?? undefined,
    prefecture: row.prefecture ?? undefined,
    region: row.region ?? undefined,
    description: tasting.mainDescription,
    tastingNotes: tasting.tastingNotes,
    foodPairings: tasting.foodPairings.length > 0 ? tasting.foodPairings : undefined,
    riceVariety: row.rice_variety ?? undefined,
    polishingRatio:
      typeof row.polishing_ratio === 'number' && Number.isFinite(row.polishing_ratio)
        ? row.polishing_ratio
        : undefined,
    alcoholPercentage:
      typeof row.alcohol_percentage === 'number' && Number.isFinite(row.alcohol_percentage)
        ? row.alcohol_percentage
        : undefined,
    flavorProfile: tasting.flavorProfile.length > 0 ? tasting.flavorProfile : undefined,
    servingTemperature:
      tasting.servingTemperature.length > 0 ? tasting.servingTemperature : undefined,
  };
}

function escapeIlike(value: string): string {
  return value.replace(/[%_,]/g, '');
}

function scoreCatalogCandidate(row: Sake, query: CatalogMatchQuery): number {
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
    typeof row.polishing_ratio === 'number' &&
    Number.isFinite(row.polishing_ratio)
  ) {
    const delta = Math.abs(row.polishing_ratio - query.polishingRatio);
    if (delta <= 1) score += 30;
    else if (delta <= 5) score += 15;
  }

  const gNums: string[] = gn.match(/\d+/g) ?? [];
  const nNums: string[] = n.match(/\d+/g) ?? [];
  if (gNums.length > 0 && gNums.some((x) => nNums.includes(x))) score += 25;

  // Prefer rows with community signal / imagery on ties
  score += Math.min(row.total_ratings ?? 0, 15);
  if (row.image_url) score += 8;
  if (row.average_rating != null && row.average_rating > 0) score += 5;

  return score;
}

function toCandidate(row: Sake, score: number): CatalogMatchCandidate {
  return {
    id: row.id,
    name: row.name,
    brewery: row.brewery,
    nameJapanese: row.name_japanese ?? undefined,
    type: row.type ?? undefined,
    imageUrl: row.image_url ?? undefined,
    polishingRatio:
      typeof row.polishing_ratio === 'number' && Number.isFinite(row.polishing_ratio)
        ? row.polishing_ratio
        : undefined,
    score,
  };
}

/**
 * Find the best matching catalog row for a Vision-identified sake.
 * Returns candidates when the top 2–3 scores are close ("Did you mean?").
 */
export async function findCatalogSakeMatch(
  nameOrQuery: string | CatalogMatchQuery,
  brewery?: string,
): Promise<CatalogMatchResult | null> {
  const query: CatalogMatchQuery =
    typeof nameOrQuery === 'string'
      ? { name: nameOrQuery, brewery: brewery ?? '' }
      : nameOrQuery;

  const cleanedName = query.name.trim();
  if (!cleanedName) return null;

  const safeName = escapeIlike(cleanedName);
  const token = escapeIlike(cleanedName.split(/\s+/)[0] ?? cleanedName);
  const safeJp = escapeIlike(query.nameJapanese?.trim() ?? '');
  const orParts = [
    `name.ilike.%${safeName}%`,
    `name.ilike.%${token}%`,
    `name_japanese.ilike.%${safeName}%`,
  ];
  if (safeJp) orParts.push(`name_japanese.ilike.%${safeJp}%`);

  const { data, error } = await supabase
    .from('sake')
    .select('*')
    .or(orParts.join(','))
    .order('total_ratings', { ascending: false })
    .limit(20);

  if (error || !data?.length) {
    if (error) console.warn('Catalog lookup failed:', error.message);
    return null;
  }

  const rows = data as Sake[];
  const scored = rows
    .map((row) => ({ row, score: scoreCatalogCandidate(row, query) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aRich = (a.row.image_url ? 1 : 0) + (a.row.total_ratings ?? 0);
      const bRich = (b.row.image_url ? 1 : 0) + (b.row.total_ratings ?? 0);
      return bRich - aRich;
    });

  const MATCH_THRESHOLD = 55;
  const CLOSE_SCORE_GAP = 18;
  const viable = scored.filter((s) => s.score >= MATCH_THRESHOLD);
  if (viable.length === 0) return null;

  const best = viable[0];
  const close = viable
    .filter((s) => s.row.id !== best.row.id && best.score - s.score <= CLOSE_SCORE_GAP)
    .slice(0, 2);
  const ambiguous = close.length > 0;
  const candidates = [best, ...close].map((s) => toCandidate(s.row, s.score));

  return {
    id: best.row.id,
    sake: catalogSakeToScanInfo(best.row),
    score: best.score,
    ambiguous,
    candidates: ambiguous ? candidates : [],
    averageRating: best.row.average_rating,
  };
}

/** True when the catalog/Vision payload still lacks user-facing narrative details. */
export function sakeNeedsEnrichment(sake: {
  description?: string;
  tastingNotes?: string;
  flavorProfile?: string[];
  foodPairings?: string[];
}): boolean {
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
