import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function hashQuestion(text: string): string {
  return btoa(unescape(encodeURIComponent(text))).slice(0, 32);
}

function tokenizeWords(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Claim a queued job
    const { data: jobRow } = await supabaseService
      .from("content_analysis_jobs")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!jobRow) {
      return new Response(JSON.stringify({ success: true, message: "No jobs available" }), { headers: corsHeaders });
    }

    const jobId = jobRow.id;
    await supabaseService
      .from("content_analysis_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // Fetch project & documents
    const { data: project } = await supabaseService
      .from("research_projects")
      .select("*")
      .eq("id", jobRow.project_id)
      .single();

    const { data: docs } = await supabaseService
      .from("research_documents")
      .select("id, content, name")
      .eq("project_id", jobRow.project_id);

    const transcripts = (docs || [])
      .filter((d: any) => typeof d.content === "string" && d.content.trim().length > 50)
      .map((d: any) => d.content);

    if (!project || transcripts.length === 0) {
      await supabaseService
        .from("content_analysis_jobs")
        .update({ status: "failed", error_message: "No transcripts or project not found" })
        .eq("id", jobId);
      return new Response(JSON.stringify({ success: false, error: "No transcripts" }), { headers: corsHeaders });
    }

    // Prepare Azure config
    const azureApiKey = Deno.env.get("FMR_AZURE_OPENAI_API_KEY");
    const azureEndpoint = Deno.env.get("FMR_AZURE_OPENAI_ENDPOINT");
    const azureDeployment = Deno.env.get("FMR_AZURE_OPENAI_DEPLOYMENT") || "gpt-4o-mini";
    const azureVersion = Deno.env.get("FMR_AZURE_OPENAI_VERSION") || "2024-02-15-preview";
    if (!azureApiKey || !azureEndpoint) throw new Error("Azure OpenAI credentials not configured");

    // Simple guide extraction pass (small call) to list questions in order
    const guideText = project.guide_context || transcripts.slice(0, 1).join("\n\n");
    const qaApiUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureVersion}`;

    const extractPrompt = `Extract an ordered list of discussion guide questions exactly as written. Return JSON ONLY:
{ "questions": [ {"section": "...", "question": "..."} ] }
SOURCE:\n${guideText.slice(0, 4000)}`;

    const extractRes = await fetch(qaApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureApiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Return only JSON." },
          { role: "user", content: extractPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.2,
      }),
    });

    const extractJson = await extractRes.json();
    let questions: any[] = [];
    try {
      const text = extractJson.choices?.[0]?.message?.content?.trim() || "";
      questions = JSON.parse(text).questions || [];
    } catch {
      questions = [];
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      await supabaseService
        .from("content_analysis_jobs")
        .update({ status: "failed", error_message: "Failed to extract discussion guide questions" })
        .eq("id", jobId);
      return new Response(JSON.stringify({ success: false, error: "No questions extracted" }), { headers: corsHeaders });
    }

    // Process each question in compact chunks
    const result: any = { content_analysis: { title: "Guide-aligned matrix", questions: [] } };

    for (const q of questions) {
      const qText = q.question || "";
      const qSection = q.section || "";

      // Compact retrieval via simple keyword filter (first iteration)
      const candidatePassages = transcripts
        .map((t) => t)
        .flatMap((t) => {
          const segments = t.split(/\n\n+/).filter((s) => s.length > 100);
          return segments.filter((s) => s.toLowerCase().includes(qText.toLowerCase().split(" ")[0] || ""));
        })
        .slice(0, 6);

      const mergedContext = candidatePassages.join("\n\n---\n\n").slice(0, 6000);

      const qaPrompt = `You will fill one row for a guide-aligned matrix. JSON ONLY.
Question: ${qText}
Section: ${qSection}
Passages (search results):\n${mergedContext}
Return JSON ONLY in this format:
{
  "question_type": "${qSection}",
  "question": "${qText}",
  "respondents": {
    "Respondent-01": {
      "profile": {"role": "", "geography": "", "specialty": "", "experience": ""},
      "quote": "(50-150 words verbatim from passages)",
      "summary": "(3-4 sentences)",
      "theme": "(short, specific phrase)"
    }
  }
}`;

      const qaRes = await fetch(qaApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": azureApiKey },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Return only JSON. Quotes must be verbatim from provided passages." },
            { role: "user", content: qaPrompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 700,
          temperature: 0.3,
        }),
      });

      const qaJson = await qaRes.json();
      let row: any = null;
      try {
        const text = qaJson.choices?.[0]?.message?.content?.trim() || "";
        row = JSON.parse(text);
      } catch {}

      if (row && row.question) {
        result.content_analysis.questions.push(row);
      } else {
        result.content_analysis.questions.push({ question_type: qSection, question: qText, respondents: {} });
      }
    }

    // Store in content_analysis_results (upsert)
    const { data: existing } = await supabaseService
      .from("content_analysis_results")
      .select("id")
      .eq("research_project_id", jobRow.project_id)
      .eq("user_id", jobRow.user_id)
      .single();

    if (existing?.id) {
      await supabaseService
        .from("content_analysis_results")
        .update({ analysis_data: result, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabaseService
        .from("content_analysis_results")
        .insert({ research_project_id: jobRow.project_id, user_id: jobRow.user_id, analysis_data: result });
    }

    await supabaseService
      .from("content_analysis_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString(), batches_total: questions.length, batches_completed: questions.length })
      .eq("id", jobId);

    return new Response(JSON.stringify({ success: true, job_id: jobId, questions: questions.length }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: String(err?.message || err) }), { status: 500, headers: corsHeaders });
  }
}); 