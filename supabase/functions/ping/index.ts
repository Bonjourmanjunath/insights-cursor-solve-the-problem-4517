import { buildCorsHeaders, json } from "../_shared/cors.ts";

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }
  return json(req, { 
    ok: true, 
    time: new Date().toISOString(),
    hasSvcKey: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
    hasUrl: Boolean(Deno.env.get('SUPABASE_URL')),
  });
}); 