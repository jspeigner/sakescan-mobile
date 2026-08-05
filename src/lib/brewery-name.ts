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
  const cleaned = breweryName.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${cleaned}%`;
}

/** True when a sake.brewery value belongs to the given catalog brewery name. */
export function sakeBelongsToBrewery(sakeBrewery: string | null | undefined, breweryName: string): boolean {
  if (!sakeBrewery?.trim() || !breweryName.trim()) return false;
  const sakeNorm = stripBreweryCorporateSuffix(sakeBrewery).toLowerCase();
  const breweryNorm = stripBreweryCorporateSuffix(breweryName).toLowerCase();
  return sakeNorm === breweryNorm || sakeNorm.startsWith(`${breweryNorm} `) || sakeNorm.startsWith(breweryNorm);
}
