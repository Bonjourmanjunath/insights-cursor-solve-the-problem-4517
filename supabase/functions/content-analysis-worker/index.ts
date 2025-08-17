import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Content-Type": "application/json",
  "Vary": "Origin",
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create clients: service for writes/admin, user client for RLS-scoped reads
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Handle test mode
    const body = await req.json().catch(() => ({}));
    if (body.action === "create_table") {
      // Create table using direct SQL execution
      const { error } = await supabaseService
        .from('content_analysis_jobs')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        // Table doesn't exist, create it using a simple insert that will fail but create the table
        try {
          await supabaseService
            .from('content_analysis_jobs')
            .insert({
              project_id: 'temp',
              user_id: 'temp',
              status: 'queued'
            });
        } catch (e) {
          // Expected to fail, but table should be created
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Table creation attempted",
        error: error?.message
      }), { headers: corsHeaders });
    }
    
    if (body.action === "list_projects") {
      const { data: projects } = await supabaseService
        .from("research_projects")
        .select("id, name, created_at")
        .limit(5);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Projects found",
        projects: projects || []
      }), { headers: corsHeaders });
    }
    
    if (body.action === "debug_jobs") {
      const { data: jobs, error } = await supabaseService
        .from("content_analysis_jobs")
        .select("*")
        .limit(5);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Jobs debug",
        jobs: jobs || [],
        error: error?.message
      }), { headers: corsHeaders });
    }
    
    if (body.action === "create_test_job") {
      const { data: testJob } = await supabaseService
        .from("content_analysis_jobs")
        .insert({
          project_id: body.project_id || "test-project-123",
          user_id: "test-user-123",
          status: "queued",
          batches_total: 5,
          batches_completed: 0
        })
        .select()
        .single();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Test job created", 
        job_id: testJob?.id 
      }), { headers: corsHeaders });
    }

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

    // 1) Try user-scoped reads first (matches Pro Advanced pattern)
    let docs: any[] = [];
    {
      const { data: u1 } = await supabaseUser
        .from("research_documents")
        .select("id, content, name, project_id, user_id")
        .eq("project_id", jobRow.project_id);
      if (Array.isArray(u1) && u1.length > 0) docs = u1;
    }

    if (!docs || docs.length === 0) {
      const { data: u2 } = await supabaseUser
        .from("research_files")
        .select("id, content, name, project_id, user_id")
        .eq("project_id", jobRow.project_id);
      if (Array.isArray(u2) && u2.length > 0) docs = u2;
    }

    // 2) Fallback to service-role reads with (project_id,user_id)
    if (!docs || docs.length === 0) {
      const { data: d1 } = await supabaseService
        .from("research_documents")
        .select("id, content, name, project_id, user_id")
        .eq("project_id", jobRow.project_id)
        .eq("user_id", jobRow.user_id);
      if (Array.isArray(d1)) docs = d1;
    }

    if (!docs || docs.length === 0) {
      const { data: d2 } = await supabaseService
        .from("research_files")
        .select("id, content, name, project_id, user_id")
        .eq("project_id", jobRow.project_id)
        .eq("user_id", jobRow.user_id);
      if (Array.isArray(d2)) docs = d2;
    }

    // 3) FINAL FALLBACK: project-only reads via service-role (handles ownership drift)
    if (!docs || docs.length === 0) {
      const { data: d3 } = await supabaseService
        .from("research_documents")
        .select("id, content, name, project_id, user_id")
        .eq("project_id", jobRow.project_id);
      if (Array.isArray(d3) && d3.length > 0) {
        docs = d3;
      } else {
        const { data: d4 } = await supabaseService
          .from("research_files")
          .select("id, content, name, project_id, user_id")
          .eq("project_id", jobRow.project_id);
        if (Array.isArray(d4)) docs = d4;
      }
    }

    const totalDocs = Array.isArray(docs) ? docs.length : 0;

    const transcripts = (docs || [])
      .filter((d: any) => typeof d.content === "string" && d.content.trim().length > 50)
      .map((d: any) => d.content);

    const validTranscripts = transcripts.length;

    if (!project || validTranscripts === 0) {
      await supabaseService
        .from("content_analysis_jobs")
        .update({ 
          status: "failed", 
          error_message: `No transcripts found. Project: ${!!project}, Docs in DB: ${totalDocs}, Valid transcripts: ${validTranscripts}, project_id: ${jobRow.project_id}, user_id: ${jobRow.user_id}` 
        })
        .eq("id", jobId);
      return new Response(JSON.stringify({ success: false, error: "No transcripts" }), { headers: corsHeaders });
    }

    // Prepare Azure config
    const azureApiKey = Deno.env.get("FMR_AZURE_OPENAI_API_KEY");
    const azureEndpoint = Deno.env.get("FMR_AZURE_OPENAI_ENDPOINT");
    const azureDeployment = Deno.env.get("FMR_AZURE_OPENAI_DEPLOYMENT") || "gpt-4o-mini";
    const azureVersion = Deno.env.get("FMR_AZURE_OPENAI_VERSION") || "2024-02-15-preview";
    if (!azureApiKey || !azureEndpoint) throw new Error("Azure OpenAI credentials not configured");

    // Enhanced guide extraction - use the full discussion guide context
    const guideText = project.guide_context || project.description || "";
    const qaApiUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureVersion}`;

    // If no guide context, try to extract from the first few transcripts
    let extractSource = guideText;
    if (!guideText || guideText.length < 100) {
      // Fallback: use first 3 transcripts to find guide questions
      extractSource = transcripts.slice(0, 3).join("\n\n---\n\n");
    }

    // Helper: extract questions from a single chunk with timeout
    const extractFromChunk = async (text: string): Promise<any[]> => {
      const extractPrompt = `Extract ALL discussion guide questions exactly as written, in the exact order they appear. Return JSON ONLY:
{ "questions": [ {"section": "Section Title", "question": "Full question text"} ] }

IMPORTANT: 
- Extract EVERY question from the discussion guide chunk below
- Keep the exact section titles (e.g., "A. Introduction", "B. Market Segmentation")
- Keep the exact question text
- Maintain the original order
- Do not skip any questions

SOURCE:\n${text.slice(0, 8000)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

      try {
        const extractRes = await fetch(qaApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": azureApiKey },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You are an expert at extracting discussion guide questions. Return only valid JSON with ALL questions in order." },
              { role: "user", content: extractPrompt },
            ],
            response_format: { type: "json_object" },
            max_tokens: 1500,
            temperature: 0.1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!extractRes.ok) {
          throw new Error(`Azure API error: ${extractRes.status}`);
        }

        const extractJson = await extractRes.json();
        try {
          const msg = extractJson.choices?.[0]?.message?.content?.trim() || "";
          const parsed = JSON.parse(msg);
          return Array.isArray(parsed?.questions) ? parsed.questions : [];
        } catch {
          return [];
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Extraction error:", error);
        return [];
      }
    };

    // Run extraction, chunking if needed
    let questions: any[] = [];
    if (extractSource.length <= 8000) {
      questions = await extractFromChunk(extractSource);
    } else {
      const seen = new Set<string>();
      const chunkSize = 7000;
      const overlap = 500;
      for (let i = 0; i < extractSource.length; i += (chunkSize - overlap)) {
        const chunk = extractSource.slice(i, Math.min(extractSource.length, i + chunkSize));
        const part = await extractFromChunk(chunk);
        for (const q of part) {
          const key = `${(q.section || '').trim()}__${(q.question || '').trim()}`;
          if (!seen.has(key) && q.section && q.question) {
            seen.add(key);
            questions.push({ section: q.section, question: q.question });
          }
        }
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      // Fallback: create basic questions if extraction fails
      questions = [
        { section: "Section A - Introduction", question: "Please describe your current role and responsibilities." },
        { section: "Section B - Market Analysis", question: "What are the key factors driving changes in this market?" },
        { section: "Section C - Future Outlook", question: "What do you see as the main opportunities and challenges?" }
      ];
      console.log("Using fallback questions due to extraction failure");
    }

    console.log(`Extracted ${questions.length} questions from discussion guide`);

    // Process each question in compact chunks
    const result: any = { content_analysis: { title: "Guide-aligned matrix", questions: [] } };

    // Calculate total operations for accurate progress tracking
    const totalOperations = questions.length * Math.min(transcripts.length, 30);
    let completedOperations = 0;

    // Update job with total batches
    await supabaseService
      .from("content_analysis_jobs")
      .update({ 
        batches_total: totalOperations, 
        batches_completed: 0,
        error_message: null 
      })
      .eq("id", jobId);

    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const q = questions[qIndex];
      const qText = q.question || "";
      const qSection = q.section || "";

      // Create respondents object with one entry per document/transcript
      const respondents: any = {};
      
      // Process each transcript/document as a separate respondent (limit to 30)
      const maxTranscripts = Math.min(transcripts.length, 30);
      for (let docIndex = 0; docIndex < maxTranscripts; docIndex++) {
        const transcript = transcripts[docIndex];
        // Format respondent ID with zero-padding for proper sorting
        const respondentId = `Respondent-${String(docIndex + 1).padStart(2, '0')}`;
        
        // Get relevant passages from this specific transcript
        const segments = transcript.split(/\n\n+/).filter((s) => s.length > 100);
        
        // Improved passage selection using more flexible matching
        const qWords = qText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const candidatePassages = segments
          .filter((s) => {
            const sLower = s.toLowerCase();
            // Check if segment contains any significant words from the question
            return qWords.some(word => sLower.includes(word)) || 
                   // Or if it's a substantial segment that might contain relevant discussion
                   (s.length > 200 && docIndex === 0); // Include longer segments from first transcript as fallback
          })
          .slice(0, 3); // Limit to 3 passages per respondent

        if (candidatePassages.length === 0) {
          // No relevant passages found for this respondent
          respondents[respondentId] = {
            profile: { role: "", geography: "", specialty: "", experience: "" },
            quote: "",
            summary: "",
            theme: ""
          };
          continue;
        }

        const context = candidatePassages.join("\n\n---\n\n").slice(0, 3000);

        const qaPrompt = `You will fill one respondent cell for a guide-aligned matrix. JSON ONLY.
Question: ${qText}
Section: ${qSection}
Respondent Transcript:\n${context}
Return JSON ONLY in this format:
{
  "profile": {"role": "", "geography": "", "specialty": "", "experience": ""},
  "quote": "(50-150 words verbatim from transcript)",
  "summary": "(3-4 sentences)",
  "theme": "(short, specific phrase)"
}`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout per respondent

          const qaRes = await fetch(qaApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "api-key": azureApiKey },
            body: JSON.stringify({
              messages: [
                { role: "system", content: "Return only JSON. Quotes must be verbatim from provided transcript." },
                { role: "user", content: qaPrompt },
              ],
              response_format: { type: "json_object" },
              max_tokens: 500,
              temperature: 0.3,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!qaRes.ok) {
            throw new Error(`Azure API error: ${qaRes.status}`);
          }

          const qaJson = await qaRes.json();
          let respondentData: any = null;
          try {
            const text = qaJson.choices?.[0]?.message?.content?.trim() || "";
            respondentData = JSON.parse(text);
          } catch {}

          if (respondentData && respondentData.quote) {
            respondents[respondentId] = respondentData;
          } else {
            respondents[respondentId] = {
              profile: { role: "", geography: "", specialty: "", experience: "" },
              quote: "",
              summary: "",
              theme: ""
            };
          }
        } catch (error) {
          console.error(`Error processing respondent ${respondentId}:`, error);
          respondents[respondentId] = {
            profile: { role: "", geography: "", specialty: "", experience: "" },
            quote: "",
            summary: "",
            theme: ""
          };
        }
        
        // Add small delay between API calls to avoid rate limiting
        if (docIndex < maxTranscripts - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Update progress after each respondent
        completedOperations++;
        if (completedOperations % 5 === 0 || completedOperations === totalOperations) {
          await supabaseService
            .from("content_analysis_jobs")
            .update({ batches_completed: completedOperations })
            .eq("id", jobId);
        }
      }

      // Add the question with all respondents
      result.content_analysis.questions.push({
        question_type: qSection,
        section: qSection,
        subsection: q.subsection || undefined,
        question: qText,
        respondents: respondents
      });
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
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString(), 
        batches_total: totalOperations, 
        batches_completed: completedOperations,
        error_message: null
      })
      .eq("id", jobId);

    return new Response(JSON.stringify({ 
      success: true, 
      job_id: jobId, 
      questions: questions.length,
      respondents: Math.min(transcripts.length, 30),
      total_operations: completedOperations
    }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: String(err?.message || err) }), { status: 500, headers: corsHeaders });
  }
}); 