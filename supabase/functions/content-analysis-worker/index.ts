import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders, json } from "../_shared/cors.ts";

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;  // MUST be service role
const supabase = createClient(url, key);

const MAX_MS = 45_000;

serve(async (req) => {
  // 1) Preflight
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: buildCorsHeaders(req), status: 204 });

  let job_id: string | undefined;
  
  try {
    if (req.method !== "POST")
      return json(req, { error: "METHOD_NOT_ALLOWED" }, { status: 405 });

    const started = Date.now();
    const body = await req.json().catch(() => ({}));
    job_id = body.job_id;
    if (!job_id) return json(req, { ok: false, error: 'MISSING_JOB_ID' }, { status: 400 });

    console.log('[WORKER] start', { job_id });

    // 1) Claim the job (avoid PGRST116 by checking rows_affected)
    const { data: upd, error: updErr } = await supabase
      .from('content_analysis_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', job_id)
      .in('status', ['queued', 'running'])       // allow resume
      .select('id,batches_total,batches_completed,status,project_id') // Added project_id
      .maybeSingle();

    if (updErr) throw updErr;
    if (!upd) return json(req, { ok: false, error: 'JOB_NOT_FOUND_OR_LOCKED' }, { status: 409 });

    // 2) Get project and guide data
    const { data: project, error: projectErr } = await supabase
      .from('research_projects')
      .select('guide_context')
      .eq('id', upd.project_id)
      .single();

    if (projectErr) throw projectErr;
    if (!project?.guide_context) {
      throw new Error('No guide context found for project');
    }

    // 3) Get documents for this project
    const { data: documents, error: docsErr } = await supabase
      .from('research_documents')
      .select('id, content')
      .eq('project_id', upd.project_id)
      .not('content', 'is', null);

    if (docsErr) throw docsErr;
    if (!documents || documents.length === 0) {
      throw new Error('No documents found for project');
    }

    console.log(`[WORKER] Processing ${documents.length} documents`);

    // 4) Process documents in chunks until time is nearly up
    let processed = 0;
    const startIndex = upd.batches_completed || 0;

    for (let i = startIndex; i < documents.length && (Date.now() - started) < MAX_MS; i++) {
      const doc = documents[i];

      try {
        // Process this document (simplified for now)
        console.log(`[WORKER] Processing document ${i + 1}/${documents.length}`);

        // TODO: Add your actual content analysis logic here
        // For now, just simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        processed++;
      } catch (error) {
        console.error(`[WORKER] Error processing document ${i}:`, error);
        // Continue with next document
      }
    }

    // 5) Update batches completed
    const newBatchesCompleted = startIndex + processed;
    await supabase
      .from('content_analysis_jobs')
      .update({
        batches_completed: newBatchesCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // 6) Finalize if no pending units left (all documents processed)
    const { count: remaining, error: remErr } = await supabase
      .from('content_analysis_jobs') // Should be content_analysis_units or check documents.length
      .select('*', { count: 'exact', head: true })
      .eq('id', job_id)
      .neq('status', 'done'); // This status is for units, not jobs

    if (remErr) throw remErr;

    // Simplified completion check for now: if all documents processed in this or previous runs
    if (newBatchesCompleted >= documents.length) {
      await supabase
        .from('content_analysis_jobs')
        .update({ status: 'completed', finished_at: new Date().toISOString() })
        .eq('id', job_id);
    } else {
      await supabase
        .from('content_analysis_jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', job_id);
    }

    console.log('[WORKER] done', { job_id, processed, newBatchesCompleted, totalDocuments: documents.length });
    return json(req, { ok: true, processed, newBatchesCompleted, totalDocuments: documents.length });
  } catch (e) {
    console.error('[WORKER] error', e);
    // Update job status to failed if an error occurs
    if (job_id) {
      await supabase
        .from('content_analysis_jobs')
        .update({ status: 'failed', error_message: String(e?.message ?? e), finished_at: new Date().toISOString() })
        .eq('id', job_id);
    }
    return json(req, { ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
});