// supabase/functions/_shared/cors.ts
const parseAllowed = () =>
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

const pickOrigin = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const allowed = parseAllowed();
  if (allowed.length === 0) return "*";
  return allowed.includes(origin) ? origin : allowed[0]; // be permissive in dev
};

export const buildCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": pickOrigin(req),
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
});

export const json = (req: Request, data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(req),
      ...(init.headers || {}),
    },
  }); 