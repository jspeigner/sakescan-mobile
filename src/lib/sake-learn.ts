/** Lightweight sake type explainers and flavor-tag tips (Phase 3B). */

export interface SakeTypeExplainer {
  id: string;
  name: string;
  polishingHint: string;
  summary: string;
  taste: string;
}

export const SAKE_TYPE_EXPLAINERS: SakeTypeExplainer[] = [
  {
    id: 'junmai',
    name: 'Junmai',
    polishingHint: 'Often ≤70% polish; no added alcohol',
    summary: 'Pure rice sake — only rice, water, koji, and yeast. Full, savory character.',
    taste: 'Rich, umami-forward, and food-friendly. Great with grilled dishes.',
  },
  {
    id: 'ginjo',
    name: 'Ginjo',
    polishingHint: '≤60% polish; may include a little distilled alcohol',
    summary: 'Fragrant, refined sake fermented cooler and slower for aromatic esters.',
    taste: 'Floral and fruity — apple, pear, banana. Best lightly chilled.',
  },
  {
    id: 'daiginjo',
    name: 'Daiginjo',
    polishingHint: '≤50% polish; premium aromatic style',
    summary: 'The most polished ginjo style — delicate, complex, and often celebratory.',
    taste: 'Elegant perfume, soft texture. Sip slowly; avoid heavy sauces.',
  },
  {
    id: 'junmai-ginjo',
    name: 'Junmai Ginjo',
    polishingHint: '≤60% polish; no added alcohol',
    summary: 'Ginjo aromatics with pure-rice depth — balanced and widely loved.',
    taste: 'Fruity nose with a clean, rounded finish.',
  },
  {
    id: 'junmai-daiginjo',
    name: 'Junmai Daiginjo',
    polishingHint: '≤50% polish; no added alcohol',
    summary: 'Top-tier pure rice sake — precision milling and careful brewing.',
    taste: 'Silky, layered, and highly aromatic. Ideal chilled.',
  },
  {
    id: 'honjozo',
    name: 'Honjozo',
    polishingHint: '≤70% polish; small amount of brewer’s alcohol',
    summary: 'Lighter body and a clean finish; easy with a wide range of food.',
    taste: 'Dry, crisp, and approachable. Works warm or chilled.',
  },
  {
    id: 'nigori',
    name: 'Nigori',
    polishingHint: 'Coarsely filtered; cloudy',
    summary: 'Unfiltered (or lightly filtered) sake with rice lees left in.',
    taste: 'Creamy, sweet-leaning, and textured. Shake gently before pouring.',
  },
  {
    id: 'sparkling',
    name: 'Sparkling',
    polishingHint: 'Naturally or force-carbonated',
    summary: 'Effervescent sake — festive and refreshing as an aperitif.',
    taste: 'Bright bubbles, often lightly sweet. Serve well chilled.',
  },
];

export const FLAVOR_TAG_TIPS: Record<string, string> = {
  Crisp: 'Clean acidity and a sharp finish — refreshing with fried foods.',
  Floral: 'Light blossom or perfume notes common in ginjo styles.',
  Smooth: 'Soft texture with little bitterness — easy sipping.',
  Fruity: 'Apple, pear, melon, or banana esters from cool fermentation.',
  Dry: 'Less residual sweetness; food-friendly and palate-cleansing.',
  Rich: 'Full body and depth — often junmai or aged styles.',
  Umami: 'Savory rice character that loves grilled or soy-based dishes.',
  Sweet: 'Noticeable residual sugar or soft fruit sweetness.',
  Earthy: 'Mineral or soil-like notes; pairs with mushrooms and root veg.',
  Spicy: 'Peppery or warming finish — try lightly warmed.',
};

/** Match a sake type string to an explainer (best-effort). */
export function findTypeExplainer(type?: string | null): SakeTypeExplainer | null {
  const t = type?.trim().toLowerCase() ?? '';
  if (!t) return null;

  const ordered = [...SAKE_TYPE_EXPLAINERS].sort((a, b) => b.name.length - a.name.length);
  for (const explainer of ordered) {
    if (t.includes(explainer.name.toLowerCase())) return explainer;
  }
  return null;
}

/** Tip text for a flavor tag (case-insensitive). */
export function getFlavorTagTip(tag: string): string | null {
  const exact = FLAVOR_TAG_TIPS[tag];
  if (exact) return exact;
  const key = Object.keys(FLAVOR_TAG_TIPS).find((k) => k.toLowerCase() === tag.trim().toLowerCase());
  return key ? FLAVOR_TAG_TIPS[key] : null;
}
