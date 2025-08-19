import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// This function is meant to be called by a cron job
// It will spawn multiple workers to process the job queue
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get number of workers to spawn from request or default to 5
    let workerCount = 5;
    try {
      const body = await req.json();
      workerCount = body.workers || 5;
    } catch {}

    console.log(`Cron job starting ${workerCount} workers...`);

    // Spawn workers in parallel
    const workerPromises = [];
    for (let i = 0; i < workerCount; i++) {
      // Call the worker function
      workerPromises.push(
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ingest-worker`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            "Content-Type": "application/json",
          },
        })
          .then(res => res.json())
          .catch(err => ({ error: err.message }))
      );
    }

    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);

    // Count successful jobs
    const processed = results.filter(r => r.success).length;
    const failed = results.filter(r => r.error).length;

    console.log(`Cron job completed: ${processed} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} jobs`,
        workers_spawned: workerCount,
        results: results,
      }),
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Cron error:", err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err?.message || err || "Internal server error"),
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}); 