import { findCatalogSakeMatch } from './sake-catalog';
import { supabase } from './supabase';

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

export interface ScanCandidate {
  id: string;
  name: string;
  brewery: string;
  nameJapanese?: string;
  type?: string;
  imageUrl?: string;
  polishingRatio?: number;
  score: number;
}

export interface ScanResult {
  success: boolean;
  sake?: SakeInfo;
  /** Set when the scan matched an existing row in `public.sake`. */
  sakeId?: string;
  /** Close alternate matches for "Did you mean?" UI. */
  candidates?: ScanCandidate[];
  ambiguous?: boolean;
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
  tastingNotes?: string;
  flavorProfile?: string[];
  servingTemperature?: string[];
  alcoholPercentage?: number;
  polishingRatio?: number;
  /** Catalog match when resolved after Vision extract. */
  sakeId?: string;
  averageRating?: number;
  recommendationScore?: number;
  recommendationTier?: 'Top Pick' | 'Good Match' | 'Try If Curious';
  recommendationReasons?: string[];
  valueLabel?: 'Great Value' | 'Fair Price' | 'Premium Price';
  /** Peer-aware chip e.g. Best value / Splurge / Best value Junmai */
  valueChip?: string;
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

export interface MenuPreferences {
  preferredFlavors?: string[];
  budgetBias?: 'value' | 'balanced' | 'premium';
}

function parsePriceValue(price?: string): number | null {
  if (!price) return null;
  const match = price.match(/[\d,.]+/);
  if (!match) return null;
  const value = Number.parseFloat(match[0].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

type ServingKind = 'glass' | 'bottle' | 'carafe' | 'unknown';

function detectServingKind(size?: string, price?: string): ServingKind {
  const blob = `${size ?? ''} ${price ?? ''}`.toLowerCase();
  if (/\b(glass|ogi|小|杯|by the glass|btg)\b/.test(blob) || /\b1?\s?8\s?0\s?ml\b/.test(blob)) {
    return 'glass';
  }
  if (/\b(bottle|btl|ビン|瓶|720|750)\b/.test(blob)) {
    return 'bottle';
  }
  if (/\b(carafe|tokkuri|徳利|300|360|500)\b/.test(blob)) {
    return 'carafe';
  }
  return 'unknown';
}

/** Normalize listed price toward a glass-equivalent for peer comparison. */
function toComparablePrice(price: number, kind: ServingKind): number {
  if (kind === 'bottle') return price / 4;
  if (kind === 'carafe') return price / 2;
  return price;
}

function peerTypeKey(type?: string): string {
  const normalized = type?.toLowerCase() ?? '';
  if (normalized.includes('daiginjo')) return 'Daiginjo';
  if (normalized.includes('ginjo')) return 'Ginjo';
  if (normalized.includes('junmai')) return 'Junmai';
  if (normalized.includes('nigori')) return 'Nigori';
  if (normalized.includes('sparkling')) return 'Sparkling';
  if (normalized.includes('honjozo')) return 'Honjozo';
  if (type?.trim()) return type.trim();
  return 'Other';
}

function mapTypeToFlavorHints(type?: string): string[] {
  const normalized = type?.toLowerCase() ?? '';
  if (normalized.includes('daiginjo') || normalized.includes('ginjo')) {
    return ['Floral', 'Fruity', 'Crisp'];
  }
  if (normalized.includes('junmai')) {
    return ['Umami', 'Rich', 'Dry'];
  }
  if (normalized.includes('nigori')) {
    return ['Sweet', 'Rich', 'Smooth'];
  }
  if (normalized.includes('sparkling')) {
    return ['Crisp', 'Fruity', 'Sweet'];
  }
  if (normalized.includes('honjozo')) {
    return ['Dry', 'Smooth', 'Crisp'];
  }
  return ['Crisp', 'Smooth'];
}

async function groundMenuItemsInCatalog(items: MenuSakeItem[]): Promise<MenuSakeItem[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const match = await findCatalogSakeMatch(item.name, item.brewery ?? '');
        if (!match) return item;

        const catalog = match.sake;
        return {
          ...item,
          sakeId: match.id,
          brewery: item.brewery ?? catalog.brewery,
          type: item.type ?? catalog.type,
          nameJapanese: item.nameJapanese ?? catalog.nameJapanese,
          flavorProfile:
            catalog.flavorProfile?.length ? catalog.flavorProfile : item.flavorProfile,
          tastingNotes: catalog.tastingNotes ?? item.tastingNotes,
          description: catalog.description?.trim()
            ? catalog.description
            : item.description,
          servingTemperature:
            catalog.servingTemperature?.length
              ? catalog.servingTemperature
              : item.servingTemperature,
          alcoholPercentage: item.alcoholPercentage ?? catalog.alcoholPercentage,
          polishingRatio: item.polishingRatio ?? catalog.polishingRatio,
          averageRating:
            typeof match.averageRating === 'number' && Number.isFinite(match.averageRating)
              ? match.averageRating
              : undefined,
        };
      } catch (err) {
        console.warn('Menu catalog match skipped for', item.name, err);
        return item;
      }
    })
  );
}

function scoreMenuRecommendations(
  items: MenuSakeItem[],
  preferences?: MenuPreferences
): MenuSakeItem[] {
  const preferredFlavors = preferences?.preferredFlavors?.length
    ? preferences.preferredFlavors
    : ['Crisp', 'Dry', 'Umami'];
  const budgetBias = preferences?.budgetBias ?? 'balanced';

  const servingKinds = items.map((item) => detectServingKind(item.size, item.price));
  const rawPrices = items.map((item) => parsePriceValue(item.price));
  const comparablePrices = items.map((item, index) => {
    const price = rawPrices[index];
    if (price === null) return null;
    return toComparablePrice(price, servingKinds[index]);
  });

  const peerMedians = new Map<string, number>();
  const peerGroups = new Map<string, number[]>();
  items.forEach((item, index) => {
    const key = peerTypeKey(item.type);
    const comparable = comparablePrices[index];
    if (comparable === null) return;
    const list = peerGroups.get(key) ?? [];
    list.push(comparable);
    peerGroups.set(key, list);
  });
  for (const [key, prices] of peerGroups) {
    if (prices.length > 0) peerMedians.set(key, getMedian(prices));
  }

  const globalValid = comparablePrices.filter((v): v is number => v !== null);
  const globalMedian = globalValid.length > 0 ? getMedian(globalValid) : null;

  const scored = items.map((item, index) => {
    const itemFlavors = item.flavorProfile?.length
      ? item.flavorProfile
      : mapTypeToFlavorHints(item.type);
    const matchedFlavors = itemFlavors.filter((flavor) => preferredFlavors.includes(flavor));
    const matches = matchedFlavors.length;
    const tasteMatch = Math.min(
      100,
      Math.round((matches / Math.max(1, preferredFlavors.length)) * 100)
    );

    const peerKey = peerTypeKey(item.type);
    const peerMedian = peerMedians.get(peerKey) ?? globalMedian;
    const comparable = comparablePrices[index];
    const kind = servingKinds[index];

    let valueScore = 55;
    let valueLabel: 'Great Value' | 'Fair Price' | 'Premium Price' = 'Fair Price';
    if (comparable !== null && peerMedian != null) {
      if (comparable <= peerMedian * 0.85) {
        valueScore = budgetBias === 'premium' ? 68 : 95;
        valueLabel = 'Great Value';
      } else if (comparable >= peerMedian * 1.2) {
        valueScore = budgetBias === 'premium' ? 82 : 42;
        valueLabel = 'Premium Price';
      } else {
        valueScore = 74;
      }
    }

    let confidence = 50;
    if (item.sakeId) confidence += 18;
    if (item.type) confidence += 10;
    if (item.price) confidence += 10;
    if (item.flavorProfile?.length) confidence += 10;
    if (item.tastingNotes) confidence += 8;
    if (item.description) confidence += 6;
    if (item.servingTemperature?.length) confidence += 4;
    if (item.averageRating != null) confidence += 4;
    confidence = Math.min(100, confidence);

    const recommendationScore = Math.round(
      0.55 * tasteMatch + 0.3 * valueScore + 0.15 * confidence
    );
    const recommendationTier: MenuSakeItem['recommendationTier'] =
      recommendationScore >= 78
        ? 'Top Pick'
        : recommendationScore >= 62
          ? 'Good Match'
          : 'Try If Curious';

    const recommendationReasons: string[] = [];
    if (matches > 0) {
      const flavorList = matchedFlavors.slice(0, 3).join('/');
      recommendationReasons.push(
        item.tastingNotes
          ? `Matches your ${flavorList} prefs; ${item.tastingNotes.slice(0, 72)}${
              item.tastingNotes.length > 72 ? '…' : ''
            }`
          : `Matches your ${flavorList} taste preference${matches > 1 ? 's' : ''}`
      );
    } else if (item.tastingNotes) {
      recommendationReasons.push(
        `Notes: ${item.tastingNotes.slice(0, 80)}${item.tastingNotes.length > 80 ? '…' : ''}`
      );
    } else {
      recommendationReasons.push('Flavor profile is less aligned with your taste prefs');
    }

    if (comparable !== null && peerMedian != null && item.price) {
      const peerLabel = peerKey === 'Other' ? 'this menu' : peerKey.toLowerCase();
      if (valueLabel === 'Great Value') {
        recommendationReasons.push(
          `${item.price}${kind !== 'unknown' ? ` ${kind}` : ''} is below median for ${peerLabel} here`
        );
      } else if (valueLabel === 'Premium Price') {
        recommendationReasons.push(
          `${item.price}${kind !== 'unknown' ? ` ${kind}` : ''} sits above median for ${peerLabel} here`
        );
      } else {
        recommendationReasons.push(
          `${item.price} is around the ${peerLabel} median on this menu`
        );
      }
    } else if (item.price) {
      recommendationReasons.push(`Listed at ${item.price}`);
    }

    if (item.averageRating != null && item.averageRating >= 4) {
      recommendationReasons.push(`Catalog avg ${item.averageRating.toFixed(1)}★`);
    } else if (!item.sakeId && !item.flavorProfile?.length) {
      recommendationReasons.push('Taste guidance inferred from sake type');
    }

    return {
      ...item,
      recommendationScore,
      recommendationTier,
      recommendationReasons: recommendationReasons.slice(0, 3),
      valueLabel,
      _peerKey: peerKey,
      _comparable: comparable,
      _kind: kind,
    };
  });

  // Assign Best value / Splurge chips vs peer type on the same menu
  const bestValueByPeer = new Map<string, number>();
  for (const row of scored) {
    if (row._comparable == null || row.valueLabel !== 'Great Value') continue;
    const prev = bestValueByPeer.get(row._peerKey);
    if (prev == null || row._comparable < prev) {
      bestValueByPeer.set(row._peerKey, row._comparable);
    }
  }

  return scored.map((row) => {
    let valueChip: string | undefined;
    if (
      row._comparable != null &&
      bestValueByPeer.get(row._peerKey) === row._comparable &&
      row.valueLabel === 'Great Value'
    ) {
      valueChip =
        row._peerKey !== 'Other' ? `Best value ${row._peerKey}` : 'Best value';
    } else if (
      row.valueLabel === 'Premium Price' &&
      (row.recommendationTier === 'Top Pick' || budgetBias === 'premium')
    ) {
      valueChip =
        row._peerKey !== 'Other' ? `Splurge ${row._peerKey}` : 'Splurge';
    } else if (row.valueLabel === 'Great Value') {
      valueChip = 'Best value';
    } else if (row.valueLabel === 'Premium Price') {
      valueChip = 'Splurge';
    }

    const { _peerKey: _pk, _comparable: _c, _kind: _k, ...item } = row;
    return { ...item, valueChip };
  });
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

/** Fill empty narrative/spec fields from enrichment; never overwrite solid Vision/catalog facts. */
function mergeSakeEnrichment(base: SakeInfo, fill: Partial<SakeInfo>): SakeInfo {
  return {
    ...base,
    nameJapanese: base.nameJapanese || fill.nameJapanese,
    type: !isWeakString(base.type) ? base.type : fill.type || base.type,
    subtype: base.subtype || fill.subtype,
    prefecture: base.prefecture || fill.prefecture,
    region: base.region || fill.region,
    description: !isWeakString(base.description) && (base.description?.length ?? 0) >= 40
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

interface EdgeScanCandidate {
  id?: unknown;
  name?: unknown;
  brewery?: unknown;
  name_japanese?: unknown;
  nameJapanese?: unknown;
  type?: unknown;
  image_url?: unknown;
  imageUrl?: unknown;
  polishing_ratio?: unknown;
  polishingRatio?: unknown;
  score?: unknown;
}

interface EdgeScanLabelResponse {
  success?: boolean;
  message?: string;
  extracted?: RawLabelSakeInfo & Record<string, unknown>;
  matched_sake?: (RawLabelSakeInfo & { id?: string; name_japanese?: string; image_url?: string; polishing_ratio?: number }) | null;
  sakeId?: string | null;
  candidates?: EdgeScanCandidate[];
  confidence?: number;
  scanQualityHint?: 'high' | 'medium' | 'low';
  qualityReasons?: string[];
  ambiguous?: boolean;
  enrichment?: Record<string, unknown> | null;
}

function mapEdgeCandidate(raw: EdgeScanCandidate): ScanCandidate | null {
  const id = toOptionalString(raw.id);
  const name = toKnownOptionalString(raw.name);
  const brewery = toKnownOptionalString(raw.brewery);
  if (!id || !name || !brewery) return null;
  return {
    id,
    name,
    brewery,
    nameJapanese: toKnownOptionalString(raw.nameJapanese ?? raw.name_japanese),
    type: toKnownOptionalString(raw.type),
    imageUrl: toKnownOptionalString(raw.imageUrl ?? raw.image_url),
    polishingRatio: toOptionalNumber(raw.polishingRatio ?? raw.polishing_ratio, 0),
    score: toOptionalNumber(raw.score) ?? 0,
  };
}

/**
 * Label scan via Supabase Edge Function (Vision + catalog match + enrichment).
 * OpenAI key stays server-side. Edge-only — clear errors on failure.
 */
export async function scanSakeLabel(imageBase64: string): Promise<ScanResult> {
  try {
    console.log('🔍 Analyzing sake label via scan-label edge function...');

    const { data, error } = await supabase.functions.invoke('scan-label', {
      body: { image_base64: imageBase64 },
    });

    if (error) {
      console.error('scan-label edge invoke error:', error);
      return {
        success: false,
        error:
          error.message ||
          'Label scan service unavailable. Check your connection and try again.',
      };
    }

    const payload = (data ?? {}) as EdgeScanLabelResponse;

    if (!payload.success || !payload.extracted) {
      return {
        success: false,
        error:
          payload.message ||
          'Could not identify sake information. Please make sure the label is clearly visible.',
        candidates: (payload.candidates ?? [])
          .map(mapEdgeCandidate)
          .filter((c): c is ScanCandidate => Boolean(c)),
      };
    }

    // Normalize snake_case matched row fields into camelCase extract shape when needed
    const extractedRaw: RawLabelSakeInfo = {
      ...payload.extracted,
      nameJapanese:
        payload.extracted.nameJapanese ??
        (payload.extracted as Record<string, unknown>).name_japanese,
      tastingNotes:
        payload.extracted.tastingNotes ??
        (payload.extracted as Record<string, unknown>).tasting_notes,
      foodPairings:
        payload.extracted.foodPairings ??
        (payload.extracted as Record<string, unknown>).food_pairings,
      riceVariety:
        payload.extracted.riceVariety ??
        (payload.extracted as Record<string, unknown>).rice_variety,
      polishingRatio:
        payload.extracted.polishingRatio ??
        (payload.extracted as Record<string, unknown>).polishing_ratio,
      alcoholPercentage:
        payload.extracted.alcoholPercentage ??
        (payload.extracted as Record<string, unknown>).alcohol_percentage,
      flavorProfile:
        payload.extracted.flavorProfile ??
        (payload.extracted as Record<string, unknown>).flavor_profile,
      servingTemperature:
        payload.extracted.servingTemperature ??
        (payload.extracted as Record<string, unknown>).serving_temperature,
    };

    const normalized = normalizeLabelSakeInfo(extractedRaw);
    if (!normalized) {
      return {
        success: false,
        error: 'Could not identify sake information. Please make sure the label is clearly visible.',
      };
    }

    const qualityFromEdge =
      payload.confidence != null || payload.scanQualityHint
        ? {
            confidenceScore: payload.confidence ?? getLabelQualityMetrics(normalized).confidenceScore,
            scanQualityHint:
              payload.scanQualityHint ?? getLabelQualityMetrics(normalized).scanQualityHint,
            qualityReasons:
              payload.qualityReasons ?? getLabelQualityMetrics(normalized).qualityReasons,
          }
        : getLabelQualityMetrics(normalized);

    let sakeInfo: SakeInfo = {
      ...normalized,
      ...qualityFromEdge,
    };

    // Prefer catalog row details when matched
    const matched = payload.matched_sake;
    const sakeId =
      toOptionalString(payload.sakeId) ??
      toOptionalString(matched?.id) ??
      undefined;

    if (matched && typeof matched.name === 'string' && typeof matched.brewery === 'string') {
      const catalogAsScan: Partial<SakeInfo> = {
        name: matched.name,
        brewery: matched.brewery,
        nameJapanese: toKnownOptionalString(
          (matched as Record<string, unknown>).nameJapanese ?? matched.name_japanese,
        ),
        type: toKnownOptionalString(matched.type) ?? sakeInfo.type,
        subtype: toKnownOptionalString(matched.subtype),
        prefecture: toKnownOptionalString(matched.prefecture),
        region: toKnownOptionalString(matched.region),
        description: toKnownOptionalString(matched.description) ?? sakeInfo.description,
        riceVariety: toKnownOptionalString(
          (matched as Record<string, unknown>).riceVariety ??
            (matched as Record<string, unknown>).rice_variety,
        ),
        polishingRatio: toOptionalNumber(
          (matched as Record<string, unknown>).polishingRatio ?? matched.polishing_ratio,
          0,
        ),
        alcoholPercentage: toOptionalNumber(
          (matched as Record<string, unknown>).alcoholPercentage ??
            (matched as Record<string, unknown>).alcohol_percentage,
          0,
        ),
      };
      sakeInfo = {
        ...mergeSakeEnrichment(sakeInfo, catalogAsScan),
        // Keep Vision/edge identity for display when catalog is thin; prefer catalog name when present
        name: catalogAsScan.name || sakeInfo.name,
        brewery: catalogAsScan.brewery || sakeInfo.brewery,
        ...qualityFromEdge,
      };
    }

    const candidates = (payload.candidates ?? [])
      .map(mapEdgeCandidate)
      .filter((c): c is ScanCandidate => Boolean(c));

    console.log('✅ Edge scan success:', sakeInfo.name, sakeId ? `(id ${sakeId})` : '(unmatched)');

    return {
      success: true,
      sake: sakeInfo,
      sakeId,
      candidates: candidates.length > 0 ? candidates : undefined,
      ambiguous: Boolean(payload.ambiguous),
    };
  } catch (error: unknown) {
    console.error('Error scanning sake label:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to analyze label. Please check your internet connection.';
    return {
      success: false,
      error: message,
    };
  }
}

export async function scanSakeMenu(
  imageBase64: string,
  preferences?: MenuPreferences
): Promise<MenuScanResult> {
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
    } catch {
      console.error('Failed to parse menu response:', content);
      return {
        success: false,
        error: 'Failed to parse menu. Make sure the menu is clearly visible.',
      };
    }

    const normalized = rawItems
      .map((item) => normalizeMenuSakeItem(item))
      .filter((item): item is MenuSakeItem => Boolean(item));
    const deduped = dedupeMenuSakes(normalized);
    const grounded = await groundMenuItemsInCatalog(deduped);
    const sakes = scoreMenuRecommendations(grounded, preferences);

    if (sakes.length === 0) {
      return {
        success: false,
        error:
          'No sake items found on this menu. Try better lighting or scan a smaller section of the menu.',
      };
    }

    const matchedCount = sakes.filter((s) => s.sakeId).length;
    console.log(`✅ Found ${sakes.length} sake items on menu (${matchedCount} catalog-matched)`);

    return { success: true, sakes };
  } catch (error: any) {
    console.error('Error scanning sake menu:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze menu. Check your internet connection.',
    };
  }
}
