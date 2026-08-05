/**
 * Helpers for matching sake.brewery text to breweries.name.
 * Mirrors jspeigner/Sakescan src/lib/brewery-slug.ts (corporate-suffix + prefix match).
 */

/** Common corporate suffixes on sake.brewery that are absent from breweries.name. */
const CORPORATE_SUFFIX_RE =
  /\s*(?:co\.?\s*,?\s*ltd\.?|co\.?|ltd\.?|inc\.?|llc|corp\.?|kk|株式会社|有限会社)\.?$/i;

/** Strip trailing Co.,Ltd / 株式会社 etc. so lookups match catalog brewery rows. */
export function stripBreweryCorporateSuffix(name: string): string {
  const trimmed = name.trim();
  const stripped = trimmed.replace(CORPORATE_SUFFIX_RE, '').replace(/[.,\s]+$/g, '').trim();
  return stripped || trimmed;
}

/**
 * Pattern for matching sake.brewery to a catalog brewery name.
 * Exact equality misses common corporate suffixes
 * ("Akita Meijyo" vs "Akita Meijyo Co.,Ltd").
 */
export function brewerySakeNamePattern(breweryName: string): string {
  // Strip LIKE wildcards from the name; trailing % is the intentional prefix.
  const cleaned = breweryName.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${cleaned}%`;
}

/**
 * True when a sake.brewery string belongs to the catalog brewery name.
 * Prefix `ilike` alone is too loose for short names ("Ito" → "Ito Shuzo",
 * "Itou"); require equality after stripping corporate suffixes on the sake side.
 * Mirrors Sakescan `sakeBreweryMatchesCatalogName` (PR #28).
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
