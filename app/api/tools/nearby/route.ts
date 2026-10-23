import { NextRequest, NextResponse } from "next/server";
import { getPatientByPhone } from "@/lib/patient";
import {
  buildNearbyHindiResponse,
  searchNearby,
} from "@/lib/nearbySearch";

const NOMINATIM_ERROR_RESPONSE = {
  places: [],
  response: "Nazdik koi jagah nahi mili.",
};

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

  try {
    const places = await searchNearby(query, location);

    return NextResponse.json({
      response: buildNearbyHindiResponse(query, places),
      places,
    });
  } catch (error) {
    console.error("Nearby search error:", error);
    return NextResponse.json(NOMINATIM_ERROR_RESPONSE);
  }
}
