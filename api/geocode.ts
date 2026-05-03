import { applyCors, applyRateLimit, safeErrorLog } from "./_lib/security";

type GeocodeBody = { query?: unknown };

function sanitizeQuery(value: unknown) {
  if (typeof value !== "string") return "";
  // SECURITY: strict normalization and control-char stripping for hostile input.
  return value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 140);
}

export default async function handler(
  req: { method?: string; body?: GeocodeBody; headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } },
  res: { setHeader: (key: string, value: string) => void; status: (code: number) => { end: () => void; json: (payload: unknown) => void } },
) {
  if (applyCors(req, res)) return;
  if (applyRateLimit(req, res)) return;

  if (req.method !== "POST") {
    // SECURITY: method allow-list to reduce attack surface.
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const query = sanitizeQuery(req.body?.query);
  if (!query || query.length < 2) {
    // SECURITY: reject malformed/unhelpful queries early.
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
    // SECURITY: encode user input in outbound URL to avoid request injection.
    const response = await fetch(url, {
      headers: {
        // SECURITY: identify caller and avoid leaking secrets in request headers.
        "User-Agent": "fuel-tracker/1.0 (geocode-proxy)",
      },
    });

    if (!response.ok) {
      safeErrorLog("geocode upstream non-200");
      res.status(502).json({ error: "Upstream geocoding failed" });
      return;
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    const safe = payload.map((item) => ({
      // SECURITY: allow-list only needed fields from external API response.
      display_name: String(item.display_name ?? ""),
      lat: Number(item.lat ?? 0),
      lon: Number(item.lon ?? 0),
    }));
    res.status(200).json({ results: safe });
  } catch (error) {
    safeErrorLog("geocode handler failed", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Security checklist for this code:
// - Applied CORS allowlist-based policy (no wildcard in production).
// - Applied per-IP rate limiting for public endpoint abuse protection.
// - Sanitized and length-limited hostile user input before outbound use.
// - Encoded user query in URL and allow-listed upstream response fields.
// - Avoided sensitive body logging; errors are scrubbed/minimal.
