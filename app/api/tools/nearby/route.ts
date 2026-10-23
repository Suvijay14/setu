import { NextRequest, NextResponse } from "next/server";
import { getPatientByPhone } from "@/lib/patient";

const NOMINATIM_SEARCH_URL =
  "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  display_name?: string;
  lat?: string;
  lon?: string;
}

interface NearbyPlace {
  display_name: string;
  lat: string;
  lon: string;
  name: string;
  address: string;
}

function shortenDisplayName(displayName: string): string {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) {
    return displayName.trim();
  }

  return `${parts[0]}, ${parts[1]}`;
}

function buildHindiResponse(query: string, places: NearbyPlace[]): string {
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

export async function POST(request: NextRequest) {
  let body: { query?: string; patient_phone?: string };

  try {
    body = (await request.json()) as { query?: string; patient_phone?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = body.query?.trim();
  const patient_phone = body.patient_phone?.trim();

  if (!query || !patient_phone) {
    return NextResponse.json(
      { error: "query and patient_phone are required" },
      { status: 400 },
    );
  }

  const patient = await getPatientByPhone(patient_phone);
  const location = patient?.location?.trim();

  if (!patient || !location) {
    return NextResponse.json({
      response:
        "Mujhe aapka area nahi pata. Kya aap bata sakte hain aap kahan hain?",
      places: [],
    });
  }

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
    return NextResponse.json(
      { error: "Failed to search nearby places" },
      { status: 502 },
    );
  }

  const searchData = (await searchResponse.json()) as NominatimResult[];

  const places: NearbyPlace[] = searchData
    .filter(
      (result) =>
        result.display_name && result.lat !== undefined && result.lon !== undefined,
    )
    .slice(0, 3)
    .map((result) => ({
      display_name: result.display_name!,
      lat: result.lat!,
      lon: result.lon!,
      name: result.display_name!,
      address: result.display_name!,
    }));

  return NextResponse.json({
    response: buildHindiResponse(query, places),
    places,
  });
}
