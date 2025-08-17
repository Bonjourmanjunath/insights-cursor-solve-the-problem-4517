import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Invalid authentication token");

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const { project_id } = body;
    if (!project_id) {
      return new Response(JSON.stringify({ success: false, error: "Project ID is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabaseService
      .from("research_projects")
      .select("id")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) throw new Error("Project not found or access denied");

    // Enqueue job
    const { data: job, error: jobError } = await supabaseService
      .from("content_analysis_jobs")
      .insert({ project_id, user_id: user.id, status: "queued" })
      .select()
      .single();

    if (jobError) throw new Error(`Failed to create job: ${jobError.message}`);

    return new Response(
      JSON.stringify({ success: true, job_id: job.id, status: job.status }),
      { headers: corsHeaders },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: String(err?.message || err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}); 