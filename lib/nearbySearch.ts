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

export function buildNearbyHindiResponse(
  query: string,
  places: NearbyPlace[],
): string {
  const [first, second, third] = places;

  if (!first) {
    return `Aapke nazdik koi ${query} nahi mila.`;
  }

  let response = `Aapke nazdik ${query} mile: Pehla ${shortenDisplayName(first.display_name)}.`;

  if (second) {
    response += ` Doosra ${shortenDisplayName(second.display_name)}.`;
  }

  if (third) {
    response += ` Teesra ${shortenDisplayName(third.display_name)}.`;
  }

  return response;
}

export async function searchNearby(
  query: string,
  location: string,
): Promise<NearbyPlace[]> {
  try {
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

    return searchData
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
  } catch (error) {
    console.error("searchNearby error:", error);
    throw error;
  }
}
