import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "*"; // If we ever use cookies, replace with exact app origin.
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  Vary: "Origin",
};

// Helper function to auto-detect respondents and extract profiles from transcript content
const detectRespondentsFromTranscript = (transcriptContent: string): string => {
  const lines = transcriptContent.split("\n").slice(0, 300);
  const speakerPatterns = new Set();
  const profileInformation = new Set();

  const speakerPatterns_array = [
    /^\s*(Respondent\s*[\d\w-]+|R[\d\w-]+)\s*:/i,
    /^\s*(Patient\s*[\d\w-]*|P[\d\w-]*)\s*:/i,
    /^\s*(Participant\s*[\d\w-]*|Part\s*[\d\w-]*)\s*:/i,
    /^\s*(Doctor|Dr\.?\s*[\w-]*|HCP\s*[\d\w-]*|Physician\s*[\d\w-]*)\s*:/i,
    /^\s*(Pharmacist\s*[\d\w-]*|Pharm\s*[\d\w-]*)\s*:/i,
    /^\s*(Nurse\s*[\d\w-]*|RN\s*[\d\w-]*)\s*:/i,
    /^\s*(Clinician\s*[\d\w-]*|Clinical\s*[\d\w-]*)\s*:/i,
    /^\s*(Interviewer|Moderator|I|M)\s*[\d\w-]*\s*:/i,
    /^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/,
    /^\s*(Director|Manager|Head|Chief|Lead)\s*[\d\w-]*\s*:/i,
  ];

  const profilePatterns = [
    /Country[:\s]+([^\n]+)/i,
    /Location[:\s]+([^\n]+)/i,
    /Region[:\s]+([^\n]+)/i,
    /City[:\s]+([^\n]+)/i,
    /Segment[:\s]+([^\n]+)/i,
    /Specialty[:\s]+([^\n]+)/i,
    /Department[:\s]+([^\n]+)/i,
    /Institution[:\s]+([^\n]+)/i,
    /Hospital[:\s]+([^\n]+)/i,
    /Practice[:\s]+([^\n]+)/i,
    /Experience[:\s]+([^\n]+)/i,
    /\b\d+\s+years?\s+(?:of\s+)?experience/i,
    /\b\d+\s+years?\s+in\s+[^\n]+/i,
    /Background[:\s]+([^\n]+)/i,
    /Usage[:\s]+([^\n]+)/i,
    /Uses?[:\s]+([^\n]+)/i,
    /Preference[:\s]+([^\n]+)/i,
    /Currently\s+using[:\s]+([^\n]+)/i,
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) continue;

    for (const pattern of speakerPatterns_array) {
      const match = trimmedLine.match(pattern);
      if (match && match[1]) {
        const speaker = match[1].trim();
        if (speaker.length > 1 && speaker.length < 50) {
          speakerPatterns.add(speaker);
        }
      }
    }

    for (const pattern of profilePatterns) {
      const match = trimmedLine.match(pattern);
      if (match && trimmedLine.length < 200) {
        profileInformation.add(trimmedLine);
      }
    }
  }

  const speakerArray = Array.from(speakerPatterns);
  const profileArray = Array.from(profileInformation);

  return `
🔍 **COMPREHENSIVE RESPONDENT DETECTION & PROFILING**:

**STEP 1: SYSTEMATIC SPEAKER IDENTIFICATION**
1. **SCAN ENTIRE TRANSCRIPT** for all speaker labels and conversation patterns
2. **DETECT ALL SPEAKER FORMATS**:
   - Standard: "Respondent 1:", "Respondent 2:", "R1:", "R2:", "Patient A:", "Patient B:"
   - Professional: "Doctor:", "Dr. Smith:", "HCP-01:", "Pharmacist-01:", "Nurse-02:"
   - Titles: "Director:", "Manager:", "Head of Clinical:", "Chief Pharmacist:"
   - Names: "John:", "Sarah:", "Mike Johnson:", "Dr. Williams:"
   - Interview staff: "Interviewer:", "Moderator:", "I:", "M:"
3. **USE ACTUAL TRANSCRIPT LABELS** - preserve exact speaker identifiers from transcript
4. **CREATE CONSISTENT IDs** when needed: HCP-01, Patient-A, Pharmacist-02, etc.

${
  speakerArray.length > 0
    ? `
📋 **DETECTED SPEAKERS** (${speakerArray.length} found):
${speakerArray
  .slice(0, 15)
  .map((speaker) => `- ${speaker}`)
  .join("\n")}
${speakerArray.length > 15 ? `... and ${speakerArray.length - 15} more` : ""}

💡 Use these exact labels as respondent identifiers in your analysis.`
    : "\n⚠️ **NO CLEAR SPEAKERS DETECTED** - Use generic identifiers like Respondent-01, Respondent-02, etc."
}

${
  profileArray.length > 0
    ? `
👤 **DETECTED PROFILE INFORMATION** (${profileArray.length} indicators found):
${profileArray
  .slice(0, 12)
  .map((info) => `- ${info}`)
  .join("\n")}
${profileArray.length > 12 ? `... and ${profileArray.length - 12} more profile indicators` : ""}

💡 Extract and organize this information into detailed respondent profiles.`
    : "\n⚠️ **LIMITED PROFILE INFORMATION** - Extract what's available from context and responses."
}
`;
};

// Helper function to create content analysis prompt
const createContentAnalysisPrompt = (
  transcriptTexts: string[],
  project: any,
): string => {
  const combinedContent = transcriptTexts.join(
    "\n\n=== TRANSCRIPT SEPARATOR ===\n\n",
  );
  const respondentDetection = detectRespondentsFromTranscript(combinedContent);
  const guideStructure = extractDiscussionGuideStructure(
    project,
    transcriptTexts,
  );

  return `
🎯 **DISCUSSION GUIDE-FIRST CONTENT ANALYSIS**

**CRITICAL MISSION**: Extract ACTUAL content from transcripts following Discussion Guide order. This is CONTENT ANALYSIS - completely independent of project type and FAR DISH logic.

${respondentDetection}

${guideStructure}

📥 **TRANSCRIPT CONTENT FOR ANALYSIS**:
${combinedContent}

🔍 **REQUIRED OUTPUT FORMAT** (JSON ONLY):
{
  "content_analysis": {
    "title": "Discussion Guide-First Content Analysis",
    "description": "Guide-aligned matrix analysis independent of project type",
    "questions": [
      {
        "question_type": "[Section/Category from Discussion Guide]",
        "question": "[Exact question text from guide or transcript]",
        "respondents": {
          "[Respondent-ID]": {
            "quote": "[Verbatim quote 50-150 words from transcript]",
            "summary": "[Detailed 2-3 sentence summary explaining insight and implications]",
            "theme": "[Dynamic, specific theme capturing 'why' and 'so what' - not generic]"
          }
        }
      }
    ]
  }
}

🚨 **CRITICAL REQUIREMENTS**:
1. **READ GUIDE FIRST**: Extract complete discussion guide structure before analyzing
2. **MAINTAIN EXACT ORDER**: Follow discussion guide sequence, not transcript flow
3. **COMPREHENSIVE MAPPING**: For each guide question, search ALL transcripts for relevant answers
4. **SEMANTIC MATCHING**: Match answers to questions even with different wording
5. **VERBATIM EXTRACTION**: Use exact transcript wording for quotes (50-150 words)
6. **DYNAMIC THEMES**: Create specific, actionable themes that capture 'why' and 'so what'
7. **SHOW ALL QUESTIONS**: Include every guide question, even if unanswered
8. **COVERAGE GUARANTEE**: Every transcript must be fully scanned for matches

❌ NEVER return fmr_dish, mode_analysis, strategic_themes, or summary structures
✅ ONLY return content_analysis structure with questions array
✅ Return ONLY valid JSON - no text before or after
`;
};

// Helper function to extract discussion guide structure
const extractDiscussionGuideStructure = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  let guideContent = "";
  let detectedStructure = [];

  if (projectConfig.guide_context && projectConfig.guide_context.trim()) {
    guideContent = projectConfig.guide_context;
    console.log("Found discussion guide in project settings");
  } else {
    const combinedContent = transcriptTexts.join("\n\n");

    const guidePatterns = {
      sections: [
        /Section\s+[A-Z]\s*[-–]\s*[^\n]+/gi,
        /Section\s+\d+[\s\-:]*[^–\n]+/gi,
        /^\s*[A-Z]\.\s+[A-Z][^\n]+$/gm,
        /^\s*\d+\.\s+[A-Z][^\n]+$/gm,
      ],
      subsections: [
        /^\s*\d+\.\s*[A-Z][A-Z\s/]+$/gm,
        /^\s*[a-z]\)\s*[A-Z][^\n]+$/gm,
        /^\s*[IVX]+\.\s*[A-Z][^\n]+$/gm,
      ],
      questions: [
        /^[A-Z][^\n]*\?$/gm,
        /Moderator:\s*[^\n]+\?/gi,
        /Interviewer:\s*[^\n]+\?/gi,
        /^\s*Q\d*[:\.]\s*[^\n]+\?/gm,
      ],
    };

    let allSections = [];
    let allSubsections = [];
    let allQuestions = [];

    guidePatterns.sections.forEach((pattern) => {
      const matches = combinedContent.match(pattern) || [];
      allSections.push(...matches);
    });

    guidePatterns.subsections.forEach((pattern) => {
      const matches = combinedContent.match(pattern) || [];
      allSubsections.push(...matches);
    });

    guidePatterns.questions.forEach((pattern) => {
      const matches = combinedContent.match(pattern) || [];
      allQuestions.push(...matches);
    });

    allSections = [...new Set(allSections)].map((s) => s.trim());
    allSubsections = [...new Set(allSubsections)].map((s) => s.trim());
    allQuestions = [...new Set(allQuestions)].map((s) => s.trim());

    if (allSections.length > 0) {
      detectedStructure.push("**MAIN SECTIONS DETECTED**:");
      allSections
        .slice(0, 15)
        .forEach((section) => detectedStructure.push(`- ${section}`));
    }

    if (allSubsections.length > 0) {
      detectedStructure.push("\n**SUBSECTIONS/CATEGORIES DETECTED**:");
      allSubsections
        .slice(0, 20)
        .forEach((subsection) => detectedStructure.push(`- ${subsection}`));
    }

    if (allQuestions.length > 0) {
      detectedStructure.push("\n**SPECIFIC QUESTIONS DETECTED**:");
      allQuestions
        .slice(0, 25)
        .forEach((question) => detectedStructure.push(`- ${question}`));
    }

    guideContent = detectedStructure.join("\n");
    console.log(
      `Extracted discussion guide structure: ${allSections.length} sections, ${allSubsections.length} subsections, ${allQuestions.length} questions`,
    );
  }

  if (!guideContent || detectedStructure.length === 0) {
    guideContent = `**DISCUSSION GUIDE STRUCTURE (DEFAULT)**:

Section A - Introduction & Background
  - Warm-up questions
  - Professional background and experience
  - Current role and responsibilities
  - Familiarity with topic area

Section B - Core Topic Exploration
  1. CURRENT PRACTICES
    - Current approaches and methods
    - Decision-making processes
    - Key considerations and criteria
  2. DRIVERS AND MOTIVATORS
    - What influences choices
    - Primary decision factors
    - Must-haves vs nice-to-haves
  3. BARRIERS AND CHALLENGES
    - Obstacles and friction points
    - Concerns and hesitations
    - Unmet needs

Section C - Specific Areas of Focus
  1. PRODUCT/SERVICE EVALUATION
    - Experience and perceptions
    - Strengths and weaknesses
    - Comparison with alternatives
  2. FUTURE CONSIDERATIONS
    - Anticipated changes
    - Emerging needs
    - Innovation opportunities

Section D - Wrap-up
  - Final thoughts and reflections
  - Additional comments
  - Closing questions`;
    console.log("Using enhanced default discussion guide structure");
  }

  return `
📋 **DISCUSSION GUIDE STRUCTURE FOR ANALYSIS**:
${guideContent}

🎯 **CRITICAL ANALYSIS INSTRUCTIONS**:
1. **READ GUIDE FIRST**: Extract and understand the complete discussion guide structure before analyzing responses
2. **MAINTAIN EXACT ORDER**: Follow the discussion guide sequence, not the transcript flow
3. **COMPREHENSIVE MAPPING**: For each guide question, search ALL transcripts for relevant answers
4. **PRESERVE HIERARCHY**: Maintain Section → Subsection → Question structure throughout
5. **SHOW ALL QUESTIONS**: Include every guide question in output, even if unanswered
6. **SEMANTIC MATCHING**: Match answers to questions even with different wording
7. **VERBATIM EXTRACTION**: Use exact transcript wording for quotes
8. **DYNAMIC THEMES**: Create specific, actionable themes that capture 'why' and 'so what'
`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
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
    const { project_id, transcript_ids } = body;

    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Project ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch project configuration
    const { data: project, error: projectError } = await supabaseService
      .from("research_projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found or access denied");
    }

    // Fetch documents for this project - try both table names
    let documents = null;
    let documentError = null;

    // First try research_documents table
    let documentQuery = supabaseService
      .from("research_documents")
      .select("*")
      .eq("user_id", user.id);

    if (transcript_ids && transcript_ids.length > 0) {
      documentQuery = documentQuery.in("id", transcript_ids);
    } else {
      documentQuery = documentQuery.eq("project_id", project_id);
    }

    const { data: documentsData, error: documentsError } = await documentQuery;

    if (documentsError || !documentsData || documentsData.length === 0) {
      // Try research_files table as fallback
      console.log("Trying research_files table as fallback...");
      let filesQuery = supabaseService
        .from("research_files")
        .select("*")
        .eq("user_id", user.id);

      if (transcript_ids && transcript_ids.length > 0) {
        filesQuery = filesQuery.in("id", transcript_ids);
      } else {
        filesQuery = filesQuery.eq("project_id", project_id);
      }

      const { data: filesData, error: filesError } = await filesQuery;

      if (filesError) {
        throw new Error(
          `Failed to fetch documents from both tables: ${documentsError?.message || "unknown"} and ${filesError.message}`,
        );
      }

      if (!filesData || filesData.length === 0) {
        throw new Error(
          "No documents found for analysis in either research_documents or research_files tables",
        );
      }

      documents = filesData;
    } else {
      documents = documentsData;
    }

    // Extract document content
    const transcriptTexts = documents
      .filter((d) => d.content && d.content.trim())
      .map((d) => d.content);

    if (transcriptTexts.length === 0) {
      throw new Error("No valid document content found for analysis");
    }

    console.log(
      `Found ${transcriptTexts.length} documents for content analysis`,
    );
    console.log(
      "Document details:",
      documents.map((d) => ({
        id: d.id,
        name: d.file_name || d.name,
        contentLength: d.content?.length || 0,
      })),
    );

    // Validate transcript content quality
    const combinedContent = transcriptTexts.join(" ");
    if (combinedContent.length < 100) {
      throw new Error("Transcript content too short for meaningful analysis");
    }

    // Get Azure OpenAI credentials
    const azureApiKey = Deno.env.get("FMR_AZURE_OPENAI_API_KEY");
    const azureEndpoint = Deno.env.get("FMR_AZURE_OPENAI_ENDPOINT");
    const azureDeployment =
      Deno.env.get("FMR_AZURE_OPENAI_DEPLOYMENT") || "gpt-4";
    const azureVersion =
      Deno.env.get("FMR_AZURE_OPENAI_VERSION") || "2024-02-15-preview";

    if (!azureApiKey || !azureEndpoint) {
      console.error("Missing Azure credentials:", {
        hasApiKey: !!azureApiKey,
        hasEndpoint: !!azureEndpoint,
        deployment: azureDeployment,
        version: azureVersion,
      });
      throw new Error("Azure OpenAI credentials not configured");
    }

    console.log("Azure OpenAI configuration:", {
      endpoint: azureEndpoint,
      deployment: azureDeployment,
      version: azureVersion,
      hasApiKey: !!azureApiKey,
    });

    // Create content analysis prompt
    const prompt = createContentAnalysisPrompt(transcriptTexts, project);
    const systemMessage =
      "You are an expert qualitative research analyst specializing in Discussion Guide-First Content Analysis. CRITICAL: This is CONTENT ANALYSIS - completely independent of project type and FAR DISH logic. You must extract actual questions from the transcript content and map all transcript responses to those questions. Extract verbatim quotes (50-150 words), detailed summaries, and dynamic themes. Return ONLY valid JSON with the content_analysis structure containing questions array. Each question must have question_type, question, and respondents object. NEVER return fmr_dish, mode_analysis, strategic_themes, or summary structures. IGNORE project type completely. Do not include any text before or after the JSON.";

    console.log("Sending content analysis request to Azure OpenAI...");

    // Call Azure OpenAI
    const apiUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureVersion}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureApiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 16000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure OpenAI API error:", errorText);
      throw new Error(
        `Azure OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const analysisResultText = data.choices[0].message.content;

    console.log("Content analysis completed successfully");
    console.log("Raw response length:", analysisResultText.length);

    // Clean and validate the JSON response
    let analysisResult;
    try {
      let cleanedText = analysisResultText.trim();

      // Remove markdown code blocks if present
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Find the JSON object boundaries
      const jsonStart = cleanedText.indexOf("{");
      const jsonEnd = cleanedText.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        throw new Error("No valid JSON object found in response");
      }

      const jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);
      analysisResult = JSON.parse(jsonText);

      console.log("Parsed JSON structure:", Object.keys(analysisResult));

      // Validate content analysis structure
      if (!analysisResult.content_analysis) {
        throw new Error("No content_analysis structure found in response");
      }

      if (
        !analysisResult.content_analysis.questions ||
        !Array.isArray(analysisResult.content_analysis.questions)
      ) {
        throw new Error(
          "Invalid content_analysis structure - questions array missing",
        );
      }

      console.log(
        "Content analysis questions count:",
        analysisResult.content_analysis.questions.length,
      );

      // Remove any non-content-analysis structures to maintain separation
      if (analysisResult.fmr_dish) {
        console.log("Removing fmr_dish from content analysis response");
        delete analysisResult.fmr_dish;
      }
      if (analysisResult.mode_analysis) {
        console.log("Removing mode_analysis from content analysis response");
        delete analysisResult.mode_analysis;
      }
      if (analysisResult.strategic_themes) {
        console.log("Removing strategic_themes from content analysis response");
        delete analysisResult.strategic_themes;
      }
      if (analysisResult.summary) {
        console.log("Removing summary from content analysis response");
        delete analysisResult.summary;
      }
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.error("Raw response causing error:", analysisResultText);
      throw new Error("Failed to parse content analysis response");
    }

    // Store content analysis result in database
    const { data: existingAnalysis, error: checkError } = await supabaseService
      .from("analysis_results")
      .select("id")
      .eq("research_project_id", project_id)
      .eq("user_id", user.id)
      .single();

    let analysisRecord;
    if (existingAnalysis) {
      // Update existing analysis
      const { data, error: updateError } = await supabaseService
        .from("analysis_results")
        .update({
          analysis_data: analysisResult,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAnalysis.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "Warning: Failed to update content analysis result:",
          updateError,
        );
      } else {
        analysisRecord = data;
        console.log("Successfully updated content analysis result in database");
      }
    } else {
      // Insert new analysis
      const { data, error: insertError } = await supabaseService
        .from("analysis_results")
        .insert({
          research_project_id: project_id,
          user_id: user.id,
          analysis_data: analysisResult,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "Warning: Failed to store content analysis result:",
          insertError,
        );
      } else {
        analysisRecord = data;
        console.log("Successfully stored content analysis result in database");
      }
    }

    // Update project timestamp
    const { error: projectUpdateError } = await supabaseService
      .from("research_projects")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", project_id);

    if (projectUpdateError) {
      console.error(
        "Warning: Failed to update project timestamp:",
        projectUpdateError,
      );
    }

    // Return content analysis response in the expected format
    const responseData = {
      success: true,
      contentAnalysis: {
        title: analysisResult.content_analysis?.title || "Content Analysis",
        description:
          analysisResult.content_analysis?.description ||
          "Guide-aligned matrix analysis",
        questions: analysisResult.content_analysis?.questions || [],
      },
      analysis: analysisResult,
      project: project,
      documents_analyzed: documents.length,
      timestamp: new Date().toISOString(),
      stored: !!analysisRecord,
      analysis_type: "content_analysis",
    };

    console.log("Content analysis completed successfully");
    console.log(
      "Questions found:",
      analysisResult.content_analysis?.questions?.length || 0,
    );
    console.log("Response structure:", {
      hasContentAnalysis: !!responseData.contentAnalysis,
      hasQuestions: !!responseData.contentAnalysis.questions,
      questionsLength: responseData.contentAnalysis.questions.length,
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in content analysis function:", error);
    console.error("Error stack:", error.stack);

    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
