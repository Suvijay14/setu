const NOMINATIM_SEARCH_URL =
  "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  display_name?: string;
  lat?: string;
  lon?: string;
}

export interface NearbyPlace {
  display_name: string;
  lat: string;
  lon: string;
  name: string;
  address: string;
  distance?: string;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceKm(km: number): string {
  if (km < 10) {
    const rounded = Math.round(km * 10) / 10;
    return `${rounded} km`;
  }
  return `${Math.round(km)} km`;
}

export async function geocodePatientLocation(
  patientLocation: string,
): Promise<{ lat: number; lon: number } | null> {
  const searchParams = new URLSearchParams({
    q: patientLocation.trim(),
    format: "json",
    limit: "1",
  });

  try {
    const response = await fetch(
      `${NOMINATIM_SEARCH_URL}?${searchParams.toString()}`,
      {
        headers: { "User-Agent": "SetuApp/1.0" },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as NominatimResult[];
    const first = data[0];
    if (!first?.lat || !first.lon) {
      return null;
    }

    return { lat: Number(first.lat), lon: Number(first.lon) };
  } catch {
    return null;
  }
}

function attachDistancesFromOrigin(
  places: NearbyPlace[],
  origin: { lat: number; lon: number },
): NearbyPlace[] {
  return places
    .map((place) => {
      const lat = Number(place.lat);
      const lon = Number(place.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return place;
      }
      const km = haversineDistance(origin.lat, origin.lon, lat, lon);
      return { ...place, distance: formatDistanceKm(km) };
    })
    .sort((a, b) => parseDistanceKm(a.distance) - parseDistanceKm(b.distance));
}

function parseDistanceKm(distance: string | undefined): number {
  if (!distance) return Number.POSITIVE_INFINITY;
  const value = Number.parseFloat(distance.replace(/\s*km$/i, ""));
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

export function shortenDisplayName(displayName: string): string {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) {
    return displayName.trim();
  }

  return `${parts[0]}, ${parts[1]}`;
}

function formatPlaceWithDistance(
  place: NearbyPlace,
  label: "Pehla" | "Doosra" | "Teesra",
): string {
  const name = shortenDisplayName(place.display_name);
  if (place.distance) {
    return `${label} ${name}, ${place.distance}`;
  }
  return `${label} ${name}`;
}

export function buildNearbyHindiResponse(
  query: string,
  places: NearbyPlace[],
): string {
  const [first, second, third] = places;

  if (!first) {
    return `Aapke nazdik koi ${query} nahi mila.`;
  }

  const hasDistance = places.some((place) => place.distance);
  const verb = hasDistance ? "hain" : "mile";

  let response = `Aapke nazdik ${query} ${verb}: ${formatPlaceWithDistance(first, "Pehla")}.`;

  if (second) {
    response += ` ${formatPlaceWithDistance(second, "Doosra")}.`;
  }

  if (third) {
    response += ` ${formatPlaceWithDistance(third, "Teesra")}.`;
  }

  return response;
}

export async function searchNearby(
  query: string,
  location: string,
): Promise<NearbyPlace[]> {
  try {
    const origin = await geocodePatientLocation(location);

    const searchParams = new URLSearchParams({
      q: `${query} ${location} India`,
      format: "json",
      limit: "3",
      "accept-language": "hi",
    });

    const searchResponse = await fetch(
      `${NOMINATIM_SEARCH_URL}?${searchParams.toString()}`,
      {
        headers: {
          "User-Agent": "SetuApp/1.0",
        },
      },
    );

    if (!searchResponse.ok) {
      console.error("Nominatim search failed:", searchResponse.status);
      return [];
    }

    const searchData = (await searchResponse.json()) as NominatimResult[];

    let places: NearbyPlace[] = searchData
      .filter(
        (result) =>
          result.display_name &&
          result.lat !== undefined &&
          result.lon !== undefined,
      )
      .slice(0, 3)
      .map((result) => ({
        display_name: result.display_name!,
        lat: result.lat!,
        lon: result.lon!,
        name: result.display_name!,
        address: result.display_name!,
      }));

    if (origin) {
      places = attachDistancesFromOrigin(places, origin);
    }

    return places;
  } catch (error) {
    console.error("searchNearby error:", error);
    throw error;
  }
}
