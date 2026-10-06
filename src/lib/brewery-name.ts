/**
 * Helpers for matching sake.brewery text to breweries.name.
 * Mirrors jspeigner/Sakescan src/lib/brewery-slug.ts.
 */

/** Common corporate suffixes on sake.brewery that are absent from breweries.name. */
const CORPORATE_SUFFIX_RE =
  /\s*(?:co\.?\s*,?\s*ltd\.?|co\.?|ltd\.?|inc\.?|llc|corp\.?|kk|株式会社|有限会社)\.?$/i;

/** Placeholder / missing brewery labels (~25k catalog rows use "Unknown"). */
const PLACEHOLDER_BREWERY_RE = /^(unknown|n\/?a|none|null|-|—|–|\.)$/i;

/** Strip trailing Co.,Ltd / 株式会社 etc. so lookups match catalog brewery rows. */
export function stripBreweryCorporateSuffix(name: string): string {
  const trimmed = name.trim();
  const stripped = trimmed.replace(CORPORATE_SUFFIX_RE, '').replace(/[.,\s]+$/g, '').trim();
  return stripped || trimmed;
}

/** True when the brewery field is empty or a known placeholder. */
export function isPlaceholderBreweryName(breweryField: string | null | undefined): boolean {
  const trimmed = (breweryField ?? '').trim();
  if (!trimmed) return true;
  return PLACEHOLDER_BREWERY_RE.test(trimmed);
}

/**
 * Pattern for matching sake.brewery to a catalog brewery name.
 * Exact equality misses common corporate suffixes
 * ("Akita Meijyo" vs "Akita Meijyo Co.,Ltd").
 */
export function brewerySakeNamePattern(breweryName: string): string {
  const cleaned = breweryName.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${cleaned}%`;
}

/**
 * True when a sake.brewery string belongs to the catalog brewery name.
 * Prefix `ilike` alone is too loose for short names ("Ito" → "Ito Shuzo");
 * require equality after stripping corporate suffixes on the sake side.
 */
export function sakeBreweryMatchesCatalogName(
  sakeBreweryField: string | null | undefined,
  catalogBreweryName: string,
): boolean {
  const catalog = catalogBreweryName.trim().toLowerCase();
  if (!catalog || !sakeBreweryField?.trim()) return false;
  const stripped = stripBreweryCorporateSuffix(sakeBreweryField).toLowerCase();
  if (stripped === catalog) return true;
  return sakeBreweryField.trim().toLowerCase() === catalog;
}
