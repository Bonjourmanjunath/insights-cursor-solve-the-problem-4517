import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Content-Type": "application/json",
  "Vary": "Origin",
};

interface DiscussionGuideSection {
  id: string;
  title: string;
  subsections?: DiscussionGuideSubsection[];
}

interface DiscussionGuideSubsection {
  id: string;
  title: string;
  questions: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Prepare Azure config
    const azureApiKey = Deno.env.get("FMR_AZURE_OPENAI_API_KEY");
    const azureEndpoint = Deno.env.get("FMR_AZURE_OPENAI_ENDPOINT");
    const azureDeployment = Deno.env.get("FMR_AZURE_OPENAI_DEPLOYMENT") || "gpt-4o-mini";
    const azureVersion = Deno.env.get("FMR_AZURE_OPENAI_VERSION") || "2024-02-15-preview";
    
    if (!azureApiKey || !azureEndpoint) {
      throw new Error("Azure OpenAI credentials not configured");
    }

    const qaApiUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureVersion}`;

    if (action === "parse_guide") {
      return await parseDiscussionGuide(body.guideText, qaApiUrl, azureApiKey);
    } else if (action === "analyze_transcript") {
      return await analyzeTranscript(body, qaApiUrl, azureApiKey);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
  } catch (error) {
    console.error("Guide-aware worker error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

async function parseDiscussionGuide(
  guideText: string, 
  qaApiUrl: string, 
  azureApiKey: string
): Promise<Response> {
  const parsePrompt = `Parse this discussion guide and extract the structure. Return JSON ONLY:

{
  "sections": [
    {
      "id": "section_1",
      "title": "Section A - Introduction",
      "subsections": [
        {
          "id": "subsection_1_1",
          "title": "Background and Experience",
          "questions": [
            "What is your main specialty and expertise?",
            "Type of practice: department, establishment (public/private)?"
          ]
        }
      ]
    }
  ]
}

IMPORTANT:
- Extract ALL sections and subsections exactly as written
- Keep the exact titles and numbering
- Extract ALL questions under each subsection
- Maintain the hierarchical structure
- Use descriptive IDs (section_1, subsection_1_1, etc.)

DISCUSSION GUIDE:
${guideText.slice(0, 8000)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(qaApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureApiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert at parsing discussion guides. Return only valid JSON." },
          { role: "user", content: parsePrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Azure API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("No content received from Azure API");
    }

    const parsed = JSON.parse(content);
    
    return new Response(JSON.stringify({ 
      success: true, 
      sections: parsed.sections || [] 
    }), { headers: corsHeaders });

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function analyzeTranscript(
  body: any, 
  qaApiUrl: string, 
  azureApiKey: string
): Promise<Response> {
  const { transcriptText, sections, respondentId } = body;

  const analysis: any = {};

  // Process each section and subsection
  for (const section of sections) {
    analysis[section.id] = {};
    
    if (section.subsections) {
      for (const subsection of section.subsections) {
        analysis[section.id][subsection.id] = {};
        
        for (let questionIndex = 0; questionIndex < subsection.questions.length; questionIndex++) {
          const question = subsection.questions[questionIndex];
          
          const analysisPrompt = `Analyze this transcript response for the specific question. Return JSON ONLY:

{
  "quote": "(50-150 words verbatim from transcript)",
  "summary": "(3-4 sentences synthesis)",
  "theme": "(short, specific phrase)",
  "profile": {
    "role": "(extracted role)",
    "geography": "(extracted location)",
    "specialty": "(extracted specialty)",
    "experience": "(extracted experience)"
  }
}

SECTION: ${section.title}
SUBSECTION: ${subsection.title}
QUESTION: ${question}
TRANSCRIPT: ${transcriptText.slice(0, 4000)}

IMPORTANT:
- Quote must be verbatim from transcript (50-150 words)
- Summary should be 3-4 sentences
- Theme should be a short, specific phrase
- Extract profile information from the transcript
- If no relevant response, return empty strings`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          try {
            const response = await fetch(qaApiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "api-key": azureApiKey },
              body: JSON.stringify({
                messages: [
                  { role: "system", content: "You are an expert at analyzing transcript responses. Return only valid JSON." },
                  { role: "user", content: analysisPrompt },
                ],
                response_format: { type: "json_object" },
                max_tokens: 800,
                temperature: 0.3,
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`Azure API error: ${response.status}`);
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content?.trim();
            
            if (content) {
              const parsed = JSON.parse(content);
              analysis[section.id][subsection.id][questionIndex] = {
                [respondentId]: {
                  quote: parsed.quote || "",
                  summary: parsed.summary || "",
                  theme: parsed.theme || "",
                  profile: parsed.profile || {
                    role: "",
                    geography: "",
                    specialty: "",
                    experience: ""
                  }
                }
              };
            } else {
              analysis[section.id][subsection.id][questionIndex] = {
                [respondentId]: {
                  quote: "",
                  summary: "",
                  theme: "",
                  profile: {
                    role: "",
                    geography: "",
                    specialty: "",
                    experience: ""
                  }
                }
              };
            }
          } catch (error) {
            clearTimeout(timeoutId);
            console.error(`Error analyzing question ${questionIndex}:`, error);
            analysis[section.id][subsection.id][questionIndex] = {
              [respondentId]: {
                quote: "",
                summary: "",
                theme: "",
                profile: {
                  role: "",
                  geography: "",
                  specialty: "",
                  experience: ""
                }
              }
            };
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    analysis 
  }), { headers: corsHeaders });
} 