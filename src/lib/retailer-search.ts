export interface RetailerInfo {
  name: string;
  address: string;
  city: string;
  phone?: string;
  website?: string;
  distance?: string;
  description?: string;
  specialization?: string;
}

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL?.trim() || process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL?.trim();

/**
 * Search for retailers that sell a specific sake via backend API
 */
export async function findSakeRetailers(
  sakeName: string,
  brewery: string,
  city: string,
  region?: string,
  latitude?: number,
  longitude?: number
): Promise<RetailerInfo[]> {
  try {
    if (!BACKEND_URL) {
      return [];
    }

    const response = await fetch(`${BACKEND_URL}/api/retailers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sakeName, brewery, city, region, latitude, longitude }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to find retailers');
    }

    return (data.retailers as RetailerInfo[])
      .filter((r) => r.name && r.address)
      .slice(0, 10);
  } catch (error) {
    console.error('Error finding sake retailers:', error);
    throw error;
  }
}

/**
 * Generate a Google Maps search URL for a retailer
 */
export function getGoogleMapsUrl(retailer: RetailerInfo): string {
  const query = encodeURIComponent(`${retailer.name} ${retailer.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Generate a phone call URL
 */
export function getPhoneUrl(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  return `tel:${cleaned}`;
}
