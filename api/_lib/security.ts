type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
};

type ApiResponse = {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => { end: () => void; json: (payload: unknown) => void };
};

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const bucket = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: ApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

export function applyCors(req: ApiRequest, res: ApiResponse) {
  const origin = String(req.headers.origin ?? "");
  const allowlist = String(process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (origin && allowlist.includes(origin)) {
    // SECURITY: pin CORS to explicit trusted origins, never wildcard in production.
    res.setHeader("Access-Control-Allow-Origin", origin);
    // SECURITY: caches vary by Origin to avoid cross-origin cache poisoning.
    res.setHeader("Vary", "Origin");
  }

  // SECURITY: restrict allowed methods for the endpoint.
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  // SECURITY: only allow headers needed by this API surface.
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function applyRateLimit(req: ApiRequest, res: ApiResponse) {
  const ip = getClientIp(req);
  const now = Date.now();
  const current = bucket.get(ip);

  if (!current || current.resetAt <= now) {
    bucket.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  current.count += 1;
  if (current.count > RATE_MAX_REQUESTS) {
    // SECURITY: throttle abusive traffic on public API endpoints.
    res.status(429).json({ error: "Too many requests" });
    return true;
  }
  return false;
}

export function safeErrorLog(message: string, details?: unknown) {
  // SECURITY: log only minimal metadata and avoid full request bodies/secrets/PII.
  console.error(`[security] ${message}`, {
    hasDetails: Boolean(details),
  });
}
