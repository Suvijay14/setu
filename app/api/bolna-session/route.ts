const BOLNA_SESSION_URL = "https://api.bolna.ai/web-call/session";

const DEFAULT_USER_DATA = {
  agent_type: "b2c",
  patient_name: "Guest",
  medications: "BP tablet",
  patient_phone: "demo",
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.BOLNA_API_KEY;

    let userData = DEFAULT_USER_DATA;
    let agentId =
      process.env.BOLNA_AGENT_ID ??
      process.env.NEXT_PUBLIC_BOLNA_AGENT_ID_B2C ??
      "";

    try {
      const body = (await request.json()) as {
        agent_id?: string;
        user_data?: Record<string, unknown>;
      };
      if (body?.agent_id?.trim()) {
        agentId = body.agent_id.trim();
      }
      if (body?.user_data && typeof body.user_data === "object") {
        userData = { ...DEFAULT_USER_DATA, ...body.user_data };
      }
    } catch {
      // SDK may POST an empty body when userData is unset
    }

    if (!apiKey || !agentId) {
      return Response.json(
        {
          error:
            "Missing env vars: BOLNA_API_KEY or agent_id (BOLNA_AGENT_ID / NEXT_PUBLIC_BOLNA_AGENT_ID_B2C)",
        },
        { status: 500 },
      );
    }

    const r = await fetch(BOLNA_SESSION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        user_data: userData,
      }),
    });

    console.log("Bolna session response status:", r.status);
    const responseBody = await r.text();
    console.log("Bolna session response body:", responseBody);

    if (r.status !== 200) {
      let bolnaError: string = responseBody;
      try {
        const parsed = JSON.parse(responseBody) as Record<string, unknown>;
        bolnaError =
          (typeof parsed.message === "string" && parsed.message) ||
          (typeof parsed.error === "string" && parsed.error) ||
          (typeof parsed.detail === "string" && parsed.detail) ||
          responseBody;
      } catch {
        // use raw text
      }
      return Response.json(
        { error: bolnaError, bolna_status: r.status },
        { status: 500 },
      );
    }

    try {
      return Response.json(JSON.parse(responseBody), { status: 200 });
    } catch {
      return Response.json(
        { error: "Bolna returned 200 but response was not valid JSON" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("bolna-session POST failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown bolna-session error";
    return Response.json({ error: message }, { status: 500 });
  }
}
