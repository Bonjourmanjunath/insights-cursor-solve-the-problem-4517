import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders, json } from "../_shared/cors.ts";
import OpenAI from "npm:openai";

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(url, key);

// Azure OpenAI client
function azureClientFor(deployment: string) {
  const endpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT")!;
  const apiKey = Deno.env.get("AZURE_OPENAI_API_KEY")!;
  const apiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION") ?? "2025-01-01-preview";
  return new OpenAI({
    apiKey,
    baseURL: `${endpoint}openai/deployments/${deployment}`,
    defaultHeaders: { "api-key": apiKey },
    defaultQuery: { "api-version": apiVersion },
  });
}

const DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "gpt-4o-mini";

serve(async (req) => {
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

    console.log('[ENHANCED WORKER] Starting analysis for job:', job_id);

    // 1) Claim the job
    const { data: job, error: jobErr } = await supabase
      .from('content_analysis_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', job_id)
      .in('status', ['queued', 'running'])
      .select('id,batches_total,batches_completed,status,project_id')
      .maybeSingle();

    if (jobErr) throw jobErr;
    if (!job) return json(req, { ok: false, error: 'JOB_NOT_FOUND_OR_LOCKED' }, { status: 409 });

    // 2) Get project and guide data
    const { data: project, error: projectErr } = await supabase
      .from('research_projects')
      .select('guide_context, name')
      .eq('id', job.project_id)
      .single();

    if (projectErr) throw projectErr;
    if (!project?.guide_context) {
      throw new Error('No guide context found for project');
    }

    // 3) Parse the guide context
    const guideData = JSON.parse(project.guide_context);
    console.log(`[ENHANCED WORKER] Guide has ${guideData.sections?.length || 0} sections`);

    // 4) Get documents for this project
    const { data: documents, error: docsErr } = await supabase
      .from('research_documents')
      .select('id, content, respondent_name')
      .eq('project_id', job.project_id)
      .not('content', 'is', null);

    if (docsErr) throw docsErr;
    if (!documents || documents.length === 0) {
      throw new Error('No documents found for project');
    }

    console.log(`[ENHANCED WORKER] Processing ${documents.length} documents`);

    // 5) Extract all questions from guide
    const allQuestions = extractAllQuestions(guideData);
    console.log(`[ENHANCED WORKER] Extracted ${allQuestions.length} questions from guide`);

    // 6) Process each document and find answers for each question
    const analysisResults = [];
    const openai = azureClientFor(DEPLOYMENT);

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const respondentName = doc.respondent_name || `Respondent_${i + 1}`;
      
      console.log(`[ENHANCED WORKER] Processing document ${i + 1}/${documents.length} for ${respondentName}`);

      // Process each question for this document
      for (const question of allQuestions) {
        try {
          const answer = await analyzeQuestionForDocument(openai, question, doc.content, respondentName);
          if (answer) {
            analysisResults.push({
              question_id: question.id,
              question_text: question.text,
              question_type: question.section,
              respondent: respondentName,
              quote: answer.quote,
              summary: answer.summary,
              theme: answer.theme,
              confidence: answer.confidence
            });
          }
        } catch (error) {
          console.error(`[ENHANCED WORKER] Error processing question ${question.id}:`, error);
        }
      }

      // Update progress
      await supabase
        .from('content_analysis_jobs')
        .update({
          batches_completed: i + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id);
    }

    // 7) Save results to database
    if (analysisResults.length > 0) {
      const { error: saveErr } = await supabase
        .from('analysis_results')
        .upsert(analysisResults, { onConflict: 'question_id,respondent' });

      if (saveErr) throw saveErr;
    }

    // 8) Mark job as completed
    await supabase
      .from('content_analysis_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        batches_completed: documents.length
      })
      .eq('id', job_id);

    console.log(`[ENHANCED WORKER] Analysis completed with ${analysisResults.length} results`);

    return json(req, { 
      ok: true, 
      results_count: analysisResults.length,
      questions_processed: allQuestions.length,
      documents_processed: documents.length
    });

  } catch (error) {
    console.error('[ENHANCED WORKER] Error:', error);
    
    if (job_id) {
      await supabase
        .from('content_analysis_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', job_id);
    }

    return json(req, { ok: false, error: error.message }, { status: 500 });
  }
});

function extractAllQuestions(guideData: any): Array<{id: string, text: string, section: string}> {
  const questions = [];
  
  if (guideData.sections) {
    for (const section of guideData.sections) {
      const sectionTitle = section.title || 'Unknown Section';
      
      // Add main questions
      if (section.questions) {
        for (const q of section.questions) {
          questions.push({
            id: q.id || `Q_${questions.length + 1}`,
            text: q.text,
            section: sectionTitle
          });
        }
      }
      
      // Add subsection questions
      if (section.subsections) {
        for (const sub of section.subsections) {
          for (const q of sub.questions || []) {
            questions.push({
              id: q.id || `Q_${questions.length + 1}`,
              text: q.text,
              section: `${sectionTitle} - ${sub.title}`
            });
          }
        }
      }
    }
  }
  
  return questions;
}

async function analyzeQuestionForDocument(
  openai: OpenAI, 
  question: {id: string, text: string, section: string}, 
  documentContent: string, 
  respondentName: string
) {
  const prompt = `You are analyzing a research transcript to find answers to specific questions.

QUESTION: ${question.text}
SECTION: ${question.section}
RESPONDENT: ${respondentName}

TRANSCRIPT CONTENT:
${documentContent.substring(0, 8000)} // Limit content length

Please analyze this transcript and provide:
1. A direct quote from the respondent that answers this question (if found)
2. A brief summary of their response
3. The main theme or insight from their answer
4. Your confidence level (0-100) that this answer addresses the question

Respond in this exact JSON format:
{
  "quote": "exact quote from transcript or 'No relevant quote found'",
  "summary": "brief summary of response",
  "theme": "main theme or insight",
  "confidence": 85
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: DEPLOYMENT,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const parsed = JSON.parse(response);
      return {
        quote: parsed.quote || "No relevant quote found",
        summary: parsed.summary || "No summary available",
        theme: parsed.theme || "No theme identified",
        confidence: parsed.confidence || 0
      };
    }
  } catch (error) {
    console.error(`Error analyzing question ${question.id}:`, error);
  }

  return null;
} 