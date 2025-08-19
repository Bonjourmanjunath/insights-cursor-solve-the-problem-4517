import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders, json } from "../_shared/cors.ts";
import OpenAI from "npm:openai";

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;  // MUST be service role
const supabase = createClient(url, key);

// Azure OpenAI client
function azureClientFor(deployment: string) {
  const endpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT")!;
  const apiKey = Deno.env.get("AZURE_OPENAI_API_KEY")!;
  const apiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION") ?? "2025-01-01-preview";
  return new OpenAI({
    apiKey,
    baseURL: `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    defaultQuery: { "api-version": apiVersion },
    defaultHeaders: { "api-key": apiKey },
  });
}

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

    // Parse the guide context
    let guideQuestions: any[] = [];
    try {
      const guideData = JSON.parse(project.guide_context);
      if (guideData.sections) {
        guideQuestions = guideData.sections.flatMap((section: any) => 
          section.questions?.map((q: any) => ({
            question_type: `${section.title}: ${q.question}`,
            question: q.question,
            section: section.title
          })) || []
        );
      }
    } catch (e) {
      console.error('Error parsing guide context:', e);
      throw new Error('Invalid guide context format');
    }

    if (guideQuestions.length === 0) {
      throw new Error('No questions found in guide context');
    }

    console.log(`[WORKER] Found ${guideQuestions.length} questions from guide`);

    // 3) Get documents for this project
    const { data: documents, error: docsErr } = await supabase
      .from('research_documents')
      .select('id, content, respondent_name')
      .eq('project_id', upd.project_id)
      .not('content', 'is', null);

    if (docsErr) throw docsErr;
    if (!documents || documents.length === 0) {
      throw new Error('No documents found for project');
    }

    console.log(`[WORKER] Processing ${documents.length} documents`);

    // 4) Process documents and extract answers for each question
    let processed = 0;
    const startIndex = upd.batches_completed || 0;
    const allResults: any[] = [];

    for (let i = startIndex; i < documents.length && (Date.now() - started) < MAX_MS; i++) {
      const doc = documents[i];
      const respondentName = doc.respondent_name || `Respondent_${i + 1}`;

      try {
        console.log(`[WORKER] Processing document ${i + 1}/${documents.length} for ${respondentName}`);

        // Process each question for this document
        const documentResults = await processDocumentForQuestions(doc.content, guideQuestions, respondentName, upd.project_id);
        allResults.push(...documentResults);

        processed++;
      } catch (error) {
        console.error(`[WORKER] Error processing document ${i}:`, error);
        // Continue with next document
      }
    }

    // 5) Save results to database
    if (allResults.length > 0) {
      const { error: saveErr } = await supabase
        .from('content_analysis_results')
        .upsert(allResults, { onConflict: 'project_id,question_type,respondent_name' });

      if (saveErr) {
        console.error('Error saving results:', saveErr);
      }
    }

    // 6) Update batches completed
    const newBatchesCompleted = startIndex + processed;
    await supabase
      .from('content_analysis_jobs')
      .update({
        batches_completed: newBatchesCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // 7) Finalize if all documents processed
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

    console.log('[WORKER] done', { job_id, processed, newBatchesCompleted, totalDocuments: documents.length, resultsCount: allResults.length });
    return json(req, { ok: true, processed, newBatchesCompleted, totalDocuments: documents.length, resultsCount: allResults.length });
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

// Function to process a document and extract answers for each question
async function processDocumentForQuestions(documentContent: string, questions: any[], respondentName: string, projectId: string) {
  const client = azureClientFor("gpt-4o-mini");
  const results: any[] = [];

  for (const question of questions) {
    try {
      const prompt = `You are analyzing a research transcript to find answers to specific questions.

QUESTION: ${question.question}

TRANSCRIPT CONTENT:
${documentContent}

Please analyze the transcript and provide:
1. A direct QUOTE from the transcript that best answers this question (if found)
2. A SUMMARY of the respondent's answer in your own words
3. A THEME that captures the main idea or sentiment

If no relevant answer is found, respond with "No relevant content found" for all fields.

Respond in this exact JSON format:
{
  "quote": "exact quote from transcript or 'No relevant content found'",
  "summary": "summary in your own words or 'No relevant content found'",
  "theme": "main theme or 'No relevant content found'"
}`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const analysis = JSON.parse(content);
          results.push({
            project_id: projectId,
            question_type: question.question_type,
            question: question.question,
            respondent_name: respondentName,
            quote: analysis.quote || "No relevant content found",
            summary: analysis.summary || "No relevant content found",
            theme: analysis.theme || "No relevant content found",
            created_at: new Date().toISOString()
          });
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          results.push({
            project_id: projectId,
            question_type: question.question_type,
            question: question.question,
            respondent_name: respondentName,
            quote: "Error processing response",
            summary: "Error processing response",
            theme: "Error processing response",
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error(`Error processing question "${question.question}":`, error);
      results.push({
        project_id: projectId,
        question_type: question.question_type,
        question: question.question,
        respondent_name: respondentName,
        quote: "Error occurred during analysis",
        summary: "Error occurred during analysis",
        theme: "Error occurred during analysis",
        created_at: new Date().toISOString()
      });
    }
  }

  return results;
}