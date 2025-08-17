import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  Vary: "Origin",
};

Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with anon key for JWT validation
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }

    // Create service role client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const { project_id } = body;

    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: "project_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Starting job queue for project: ${project_id}`);

    // Fetch project
    const { data: project, error: projectError } = await supabaseService
      .from("research_projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found or access denied");
    }

    // Fetch documents that need processing
    const { data: documents, error: documentError } = await supabaseService
      .from("research_documents")
      .select("*")
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    if (documentError) {
      throw new Error(`Failed to fetch documents: ${documentError.message}`);
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No documents found to process", 
          jobs_created: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update project metadata
    const { data: metadata } = await supabaseService
      .from("project_ingest_metadata")
      .upsert({
        project_id: project_id,
        user_id: user.id,
        status: "queued",
        total_documents: documents.length,
        jobs_total: documents.length,
        jobs_completed: 0,
        jobs_failed: 0,
        chunk_token_size: 1200,
        overlap_tokens: 200,
        embedding_model: "text-embedding-3-small",
        processing_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Create jobs for each document
    const jobs = documents.map(doc => ({
      project_id: project_id,
      document_id: doc.id,
      user_id: user.id,
      status: "queued",
      metadata: {
        document_name: doc.name,
        document_size: doc.file_size,
        file_type: doc.file_type,
      }
    }));

    // Insert jobs (upsert to handle re-runs)
    const { data: createdJobs, error: jobError } = await supabaseService
      .from("ingest_jobs")
      .upsert(jobs, { 
        onConflict: "project_id,document_id",
        ignoreDuplicates: false 
      })
      .select();

    if (jobError) {
      throw new Error(`Failed to create jobs: ${jobError.message}`);
    }

    const jobsCreated = createdJobs?.length || 0;

    console.log(`Created ${jobsCreated} jobs for project ${project_id}`);

    // Estimate completion time (30 seconds per document as baseline)
    const estimatedSeconds = jobsCreated * 30;
    const estimatedCompletion = new Date(
      Date.now() + estimatedSeconds * 1000
    ).toISOString();

    // Update metadata with estimation
    await supabaseService
      .from("project_ingest_metadata")
      .update({
        estimated_completion: estimatedCompletion,
      })
      .eq("project_id", project_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Ingestion jobs queued successfully",
        project_id: project_id,
        jobs_created: jobsCreated,
        total_documents: documents.length,
        estimated_completion: estimatedCompletion,
        metadata_id: metadata?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Error in project-ingest-queue:", err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err?.message || err || "Internal server error"),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}); 