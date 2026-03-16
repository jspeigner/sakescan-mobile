import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
}

/**
 * Request location permissions and get user's current location
 */
export async function getUserLocation(): Promise<UserLocation | null> {
  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // Reverse geocode to get city/region
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city: geocode?.city || geocode?.subregion || undefined,
      region: geocode?.region || undefined,
      country: geocode?.country || undefined,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

/**
 * Format location for display
 */
export function formatLocation(location: UserLocation): string {
  const parts = [];

  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);

  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}
