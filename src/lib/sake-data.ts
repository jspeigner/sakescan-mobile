// Mock Sake Database
export interface Brewery {
  id: string;
  name: string;
  region: string;
  country: string;
  description: string;
  founded?: number;
  imageUrl?: string;
  logoUrl?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type FlavorProfile = 'Fruity' | 'Dry' | 'Floral' | 'Smooth' | 'Rich' | 'Crisp' | 'Umami' | 'Sweet';
export type ServingTemp = 'Chilled' | 'Room' | 'Warm';

export interface Sake {
  id: string;
  name: string;
  breweryId: string;
  sakeType: 'Junmai' | 'Ginjo' | 'Daiginjo' | 'Honjozo' | 'Nigori' | 'Junmai Daiginjo' | 'Junmai Ginjo' | 'Other';
  description: string;
  tastingNotes: string;
  foodPairings: string;
  avgRating: number;
  reviewCount: number;
  labelImageUrl: string;
  alcoholContent?: string;
  riceMilling?: string;
  riceType?: string;
  flavorProfile?: FlavorProfile[];
  servingTemp?: ServingTemp[];
  purchaseUrls?: { retailer: string; url: string }[];
}

export const breweries: Brewery[] = [
  {
    id: '1',
    name: 'Asahi Shuzo',
    region: 'Yamaguchi',
    country: 'Japan',
    description: 'Renowned for their precision and dedication to the art of sake brewing, Asahi Shuzo produces the famous Dassai brand. Their philosophy focuses on using technology to perfect traditional methods, resulting in one of Japan\'s most celebrated modern sakes.',
    founded: 1948,
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200',
  },
  {
    id: '2',
    name: 'Hakkaisan Brewery',
    region: 'Niigata',
    country: 'Japan',
    description: 'A heritage of excellence in brewing, utilizing the pristine waters of Mt. Hakkai in Niigata to create sake with a crisp, clean finish. Their philosophy focuses on "high-quality sake for the public," ensuring every bottle reflects the snowy landscape of its origin through traditional hand-crafting techniques.',
    founded: 1922,
    imageUrl: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=200',
  },
  {
    id: '3',
    name: 'Gekkeikan Sake Company',
    region: 'Kyoto',
    country: 'Japan',
    description: 'Founded in 1637, Gekkeikan is one of the oldest and most respected sake breweries in Japan. With nearly four centuries of brewing expertise, they have perfected the art of creating consistent, high-quality sake that honors tradition while embracing innovation.',
    founded: 1637,
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1590132297852-d66c30d0cbf3?w=200',
  },
  {
    id: '4',
    name: 'Asahi-Shuzo (Kubota)',
    region: 'Niigata',
    country: 'Japan',
    description: 'Producer of the acclaimed Kubota brand, Asahi-Shuzo in Niigata is known for clean, refined sake with exceptional balance. Their commitment to quality has made Kubota one of the most sought-after premium sake brands worldwide.',
    founded: 1830,
    imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=200',
  },
  {
    id: '5',
    name: 'Dewazakura Brewery',
    region: 'Yamagata',
    country: 'Japan',
    description: 'A pioneering brewery in the ginjo revolution, Dewazakura is known for their aromatic and elegant sake. They helped popularize the ginjo style that has become synonymous with premium Japanese sake.',
    founded: 1892,
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1578950435899-d1c1bf932ab2?w=200',
  },
  {
    id: '6',
    name: 'Kikusui Sake Co.',
    region: 'Niigata',
    country: 'Japan',
    description: 'Known for their dry, clean sake style typical of Niigata region. Kikusui has been crafting exceptional sake for generations.',
    founded: 1881,
    imageUrl: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
  },
  {
    id: '7',
    name: 'Nanbu Bijin',
    region: 'Iwate',
    country: 'Japan',
    description: 'Southern Beauty brewery, famous for their elegant and well-balanced sake.',
    founded: 1902,
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
  },
  {
    id: '8',
    name: 'Yoshida Sake Brewery',
    region: 'Ishikawa',
    country: 'Japan',
    description: 'Producers of the acclaimed Tedorigawa brand with centuries of tradition.',
    founded: 1870,
    imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
  },
  {
    id: '9',
    name: 'Ishimoto Sake Brewery',
    region: 'Niigata',
    country: 'Japan',
    description: 'Legendary Niigata brewery known for Koshi no Kanbai, one of Japan\'s most prestigious sake.',
    founded: 1907,
    imageUrl: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
  },
  {
    id: '10',
    name: 'Imayo Tsukasa Sake Brewery',
    region: 'Niigata',
    country: 'Japan',
    description: 'Modern brewery combining traditional techniques with contemporary innovation.',
    founded: 1767,
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
  },
  {
    id: '11',
    name: 'Aoki Shuzo',
    region: 'Niigata',
    country: 'Japan',
    description: 'Producers of the acclaimed Kakurei brand with focus on clarity and elegance.',
    founded: 1717,
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
  },
];

export const sakeList: Sake[] = [
  {
    id: '1',
    name: 'Dassai 23',
    breweryId: '1',
    sakeType: 'Daiginjo',
    description: 'The pinnacle of Dassai\'s lineup, made from rice polished to 23% of its original size.',
    tastingNotes: 'Elegant and refined with notes of honeydew melon, white peach, and a subtle floral aroma. Silky smooth with a long, clean finish.',
    foodPairings: 'Sashimi, oysters, delicate white fish, fresh fruits',
    avgRating: 4.8,
    reviewCount: 2400,
    labelImageUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400',
    alcoholContent: '16%',
    riceMilling: '23%',
    riceType: 'Yamada Nishiki',
    flavorProfile: ['Fruity', 'Floral', 'Smooth'],
    servingTemp: ['Chilled'],
    purchaseUrls: [
      { retailer: 'Sake Social', url: 'https://sakesocial.com/dassai-23' },
      { retailer: 'True Sake', url: 'https://truesake.com/dassai-23' },
    ],
  },
  {
    id: '5',
    name: 'Kubota Manju',
    breweryId: '4',
    sakeType: 'Junmai Daiginjo',
    description: 'The flagship sake from Asahi-Shuzo, Kubota Manju represents the pinnacle of their brewing expertise with exceptional balance and refinement.',
    tastingNotes: 'Delicate and refined with notes of green apple, Asian pear, and subtle floral hints. Clean and elegant with a silky texture and long finish.',
    foodPairings: 'Sashimi, sea urchin, light appetizers, fresh oysters',
    avgRating: 4.9,
    reviewCount: 1800,
    labelImageUrl: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=400',
    alcoholContent: '15.5%',
    riceMilling: '33%',
    riceType: 'Gohyakumangoku',
    flavorProfile: ['Smooth', 'Floral', 'Crisp'],
    servingTemp: ['Chilled', 'Room'],
    purchaseUrls: [
      { retailer: 'Sake Social', url: 'https://sakesocial.com/kubota-manju' },
      { retailer: 'True Sake', url: 'https://truesake.com/kubota-manju' },
    ],
  },
  {
    id: '2',
    name: 'Hakkaisan Tokubetsu Honjozo',
    breweryId: '2',
    sakeType: 'Honjozo',
    description: 'A clean, well-balanced sake that showcases the pure water of the Hakkai mountains.',
    tastingNotes: 'Light and crisp with subtle rice sweetness, hints of pear, and a clean, refreshing finish.',
    foodPairings: 'Tempura, grilled fish, chicken teriyaki, light salads',
    avgRating: 4.5,
    reviewCount: 890,
    labelImageUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400',
    alcoholContent: '15.5%',
    riceMilling: '60%',
    riceType: 'Gohyakumangoku',
    flavorProfile: ['Crisp', 'Dry', 'Smooth'],
    servingTemp: ['Chilled', 'Room', 'Warm'],
    purchaseUrls: [
      { retailer: 'Sake Social', url: 'https://sakesocial.com/hakkaisan' },
    ],
  },
  {
    id: '3',
    name: 'Gekkeikan Traditional',
    breweryId: '3',
    sakeType: 'Junmai',
    description: 'A classic Junmai sake with centuries of tradition behind it.',
    tastingNotes: 'Full-bodied with rich umami flavors, hints of mushroom, steamed rice, and a warm finish.',
    foodPairings: 'Rich stews, yakitori, miso-based dishes, aged cheeses',
    avgRating: 4.2,
    reviewCount: 3200,
    labelImageUrl: 'https://images.unsplash.com/photo-1590132297852-d66c30d0cbf3?w=400',
    alcoholContent: '15%',
    riceMilling: '70%',
    riceType: 'Nihonbare',
    flavorProfile: ['Rich', 'Umami', 'Smooth'],
    servingTemp: ['Room', 'Warm'],
  },
  {
    id: '4',
    name: 'Dassai 45',
    breweryId: '1',
    sakeType: 'Junmai Daiginjo',
    description: 'Dassai 45 is a Junmai Daiginjo sake that brings together a collection of premium rice polished down to 45%. It features a delicate fruity aroma and a clean finish. The Asahi Shuzo brewery focuses on using technology to perfect traditional methods, resulting in one of Japan\'s most celebrated modern sakes.',
    tastingNotes: 'Fruity and floral with notes of apple and pear. Balanced sweetness with a smooth, gentle finish.',
    foodPairings: 'Sushi, sashimi, light appetizers, soft cheeses',
    avgRating: 4.5,
    reviewCount: 1200,
    labelImageUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400',
    alcoholContent: '16.0%',
    riceMilling: '45%',
    riceType: 'Yamada Nishiki',
    flavorProfile: ['Fruity', 'Dry', 'Floral', 'Smooth'],
    servingTemp: ['Chilled'],
    purchaseUrls: [
      { retailer: 'Sake Social', url: 'https://sakesocial.com/dassai-45' },
      { retailer: 'Wine.com', url: 'https://wine.com/dassai-45' },
    ],
  },
  {
    id: '6',
    name: 'Dewazakura Oka',
    breweryId: '5',
    sakeType: 'Ginjo',
    description: 'A pioneering ginjo sake that helped spark the ginjo boom in Japan. Known for its elegant floral aromatics.',
    tastingNotes: 'Fragrant cherry blossom and melon aromas with a delicate, refreshing palate and clean finish.',
    foodPairings: 'Light sashimi, steamed vegetables, tofu dishes, delicate appetizers',
    avgRating: 4.5,
    reviewCount: 670,
    labelImageUrl: 'https://images.unsplash.com/photo-1578950435899-d1c1bf932ab2?w=400',
    alcoholContent: '15.5%',
    riceMilling: '50%',
    riceType: 'Dewasansan',
    flavorProfile: ['Floral', 'Fruity', 'Crisp'],
    servingTemp: ['Chilled', 'Room'],
    purchaseUrls: [
      { retailer: 'Sake Social', url: 'https://sakesocial.com/dewazakura-oka' },
    ],
  },
  {
    id: '7',
    name: 'Kikusui Junmai Ginjo',
    breweryId: '6',
    sakeType: 'Junmai Ginjo',
    description: 'A premium junmai ginjo from Kikusui, showcasing the elegant style of Niigata sake with refined aromatics and clean flavor profile.',
    tastingNotes: 'Delicate floral and fruity notes with hints of green apple and melon. Smooth, rounded texture with a clean, crisp finish characteristic of Niigata-style sake.',
    foodPairings: 'Sashimi, grilled fish, light seafood dishes, fresh vegetables',
    avgRating: 4.6,
    reviewCount: 780,
    labelImageUrl: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=400',
    alcoholContent: '15%',
    riceMilling: '50%',
    riceType: 'Gohyakumangoku',
    flavorProfile: ['Crisp', 'Floral', 'Smooth'],
    servingTemp: ['Chilled', 'Room'],
    purchaseUrls: [
      { retailer: 'Sake Social', url: 'https://sakesocial.com/kikusui-junmai-ginjo' },
      { retailer: 'True Sake', url: 'https://truesake.com/kikusui-junmai-ginjo' },
    ],
  },
  {
    id: '13',
    name: 'Kikusui No Karakuchi',
    breweryId: '6',
    sakeType: 'Honjozo',
    description: 'A dry and crisp sake with clean flavors, perfect for those who prefer less sweetness.',
    tastingNotes: 'Clean and dry with subtle rice notes. Crisp finish with mild acidity.',
    foodPairings: 'Grilled meats, tempura, salty snacks',
    avgRating: 4.3,
    reviewCount: 540,
    labelImageUrl: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=400',
    alcoholContent: '15%',
    riceMilling: '70%',
    riceType: 'Gohyakumangoku',
    flavorProfile: ['Dry', 'Crisp', 'Smooth'],
    servingTemp: ['Chilled', 'Room'],
  },
  {
    id: '14',
    name: 'Nanbu Bijin',
    breweryId: '7',
    sakeType: 'Junmai',
    description: 'Southern Beauty - a well-balanced junmai sake with gentle sweetness and umami.',
    tastingNotes: 'Soft and round with notes of melon and rice. Balanced sweetness with clean finish.',
    foodPairings: 'Traditional Japanese cuisine, seafood, vegetables',
    avgRating: 4.6,
    reviewCount: 890,
    labelImageUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400',
    alcoholContent: '15.5%',
    riceMilling: '55%',
    riceType: 'Gin-Otome',
    flavorProfile: ['Smooth', 'Sweet', 'Umami'],
    servingTemp: ['Room', 'Warm'],
  },
  {
    id: '15',
    name: 'Tedorigawa Iki na Onna',
    breweryId: '8',
    sakeType: 'Junmai Daiginjo',
    description: 'A stylish woman - elegant and refined premium sake with beautiful aromatics.',
    tastingNotes: 'Delicate floral and fruit notes with silky texture. Long, elegant finish.',
    foodPairings: 'Fine dining, light seafood, fresh oysters',
    avgRating: 4.7,
    reviewCount: 430,
    labelImageUrl: 'https://images.unsplash.com/photo-1578950435899-d1c1bf932ab2?w=400',
    alcoholContent: '15%',
    riceMilling: '40%',
    riceType: 'Yamada Nishiki',
    flavorProfile: ['Floral', 'Fruity', 'Smooth'],
    servingTemp: ['Chilled'],
  },
  {
    id: '16',
    name: 'Koshi no Kanbai',
    breweryId: '9',
    sakeType: 'Honjozo',
    description: 'Cold plum of Koshi - a legendary Niigata sake known for its clean, dry profile.',
    tastingNotes: 'Crystal clear with subtle sweetness, dry finish. Extremely well-balanced.',
    foodPairings: 'Sushi, sashimi, grilled fish, light appetizers',
    avgRating: 5.0,
    reviewCount: 1500,
    labelImageUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400',
    alcoholContent: '15%',
    riceMilling: '55%',
    riceType: 'Gohyakumangoku',
    flavorProfile: ['Dry', 'Crisp', 'Smooth'],
    servingTemp: ['Chilled', 'Room'],
  },
  {
    id: '17',
    name: 'Imayo Tsukasa',
    breweryId: '10',
    sakeType: 'Ginjo',
    description: 'Black Label Ginjo - a modern interpretation of traditional Niigata brewing.',
    tastingNotes: 'Aromatic with notes of green apple and white flowers. Clean and refreshing.',
    foodPairings: 'Light seafood, salads, appetizers',
    avgRating: 4.9,
    reviewCount: 720,
    labelImageUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400',
    alcoholContent: '15.5%',
    riceMilling: '50%',
    riceType: 'Koshi Tanrei',
    flavorProfile: ['Floral', 'Crisp', 'Fruity'],
    servingTemp: ['Chilled'],
  },
  {
    id: '18',
    name: 'Kakurei',
    breweryId: '11',
    sakeType: 'Junmai Ginjo',
    description: 'Mirror of the Moon - premium junmai ginjo with exceptional clarity and depth.',
    tastingNotes: 'Elegant with melon and pear notes. Smooth texture with lasting finish.',
    foodPairings: 'Sashimi, tempura, grilled vegetables',
    avgRating: 4.8,
    reviewCount: 650,
    labelImageUrl: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=400',
    alcoholContent: '15%',
    riceMilling: '50%',
    riceType: 'Gohyakumangoku',
    flavorProfile: ['Smooth', 'Fruity', 'Floral'],
    servingTemp: ['Chilled', 'Room'],
  },
];

export const reviews: Record<string, Review[]> = {
  '1': [
    {
      id: 'r1',
      userId: 'u1',
      userName: 'Akira Tanaka',
      rating: 5,
      comment: 'Simply perfect. The complexity and elegance are unmatched. Worth every penny.',
      createdAt: '2026-01-15T10:30:00Z',
    },
    {
      id: 'r2',
      userId: 'u2',
      userName: 'Emma Wilson',
      rating: 5,
      comment: 'My first experience with premium sake. The fruity notes and smooth finish blew me away!',
      createdAt: '2026-01-10T14:22:00Z',
    },
    {
      id: 'r3',
      userId: 'u3',
      userName: 'Kenji Yamamoto',
      rating: 4,
      comment: 'Excellent sake, though I prefer the 39 for everyday drinking. This is special occasion material.',
      createdAt: '2026-01-05T09:15:00Z',
    },
  ],
  '2': [
    {
      id: 'r4',
      userId: 'u4',
      userName: 'Sarah Chen',
      rating: 4,
      comment: 'Very clean and refreshing. Great with seafood!',
      createdAt: '2026-01-20T18:45:00Z',
    },
  ],
  '3': [
    {
      id: 'r5',
      userId: 'u5',
      userName: 'Michael Brown',
      rating: 4,
      comment: 'A solid everyday sake with good depth of flavor.',
      createdAt: '2026-01-12T16:30:00Z',
    },
  ],
  '4': [
    {
      id: 'r6',
      userId: 'u1',
      userName: 'Akira Tanaka',
      rating: 5,
      comment: 'Best entry point to premium sake. Highly recommended for beginners.',
      createdAt: '2026-01-18T11:00:00Z',
    },
  ],
};

export function searchSake(query: string): Sake[] {
  const lowerQuery = query.toLowerCase();
  return sakeList.filter(
    (sake) =>
      sake.name.toLowerCase().includes(lowerQuery) ||
      breweries.find((b) => b.id === sake.breweryId)?.name.toLowerCase().includes(lowerQuery)
  );
}

export function getSakeById(id: string): Sake | undefined {
  return sakeList.find((sake) => sake.id === id);
}

export function getBreweryById(id: string): Brewery | undefined {
  return breweries.find((brewery) => brewery.id === id);
}

export function getReviewsForSake(sakeId: string): Review[] {
  return reviews[sakeId] || [];
}
