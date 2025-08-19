import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function to auto-detect respondents and extract profiles from transcript content
const detectRespondentsFromTranscript = (transcriptContent: string): string => {
  // Enhanced analysis for comprehensive respondent detection
  const lines = transcriptContent.split("\n").slice(0, 300); // Increased line analysis
  const speakerPatterns = new Set();
  const profileInformation = new Set();

  // Comprehensive speaker detection patterns
  const speakerPatterns_array = [
    // Standard respondent patterns
    /^\s*(Respondent\s*[\d\w-]+|R[\d\w-]+)\s*:/i,
    /^\s*(Patient\s*[\d\w-]*|P[\d\w-]*)\s*:/i,
    /^\s*(Participant\s*[\d\w-]*|Part\s*[\d\w-]*)\s*:/i,

    // Healthcare professional patterns
    /^\s*(Doctor|Dr\.?\s*[\w-]*|HCP\s*[\d\w-]*|Physician\s*[\d\w-]*)\s*:/i,
    /^\s*(Pharmacist\s*[\d\w-]*|Pharm\s*[\d\w-]*)\s*:/i,
    /^\s*(Nurse\s*[\d\w-]*|RN\s*[\d\w-]*)\s*:/i,
    /^\s*(Clinician\s*[\d\w-]*|Clinical\s*[\d\w-]*)\s*:/i,

    // Interview staff patterns
    /^\s*(Interviewer|Moderator|I|M)\s*[\d\w-]*\s*:/i,

    // Name patterns
    /^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/, // Names like "John:", "Sarah Smith:"

    // Professional title patterns
    /^\s*(Director|Manager|Head|Chief|Lead)\s*[\d\w-]*\s*:/i,
  ];

  // Enhanced profile information patterns
  const profilePatterns = [
    // Geographic information
    /Country[:\s]+([^\n]+)/i,
    /Location[:\s]+([^\n]+)/i,
    /Region[:\s]+([^\n]+)/i,
    /City[:\s]+([^\n]+)/i,

    // Professional information
    /Segment[:\s]+([^\n]+)/i,
    /Specialty[:\s]+([^\n]+)/i,
    /Department[:\s]+([^\n]+)/i,
    /Institution[:\s]+([^\n]+)/i,
    /Hospital[:\s]+([^\n]+)/i,
    /Practice[:\s]+([^\n]+)/i,

    // Experience and background
    /Experience[:\s]+([^\n]+)/i,
    /\b\d+\s+years?\s+(?:of\s+)?experience/i,
    /\b\d+\s+years?\s+in\s+[^\n]+/i,
    /Background[:\s]+([^\n]+)/i,

    // Usage and preferences
    /Usage[:\s]+([^\n]+)/i,
    /Uses?[:\s]+([^\n]+)/i,
    /Preference[:\s]+([^\n]+)/i,
    /Currently\s+using[:\s]+([^\n]+)/i,

    // Professional grades and levels
    /Grade\s+[A-Z]\s+([^\n]+)/i,
    /Level\s+[\d\w]+\s+([^\n]+)/i,
    /Senior\s+([^\n]+)/i,
    /Junior\s+([^\n]+)/i,

    // Organizational roles
    /Director\s+of\s+([^\n]+)/i,
    /Head\s+of\s+([^\n]+)/i,
    /Manager\s+of\s+([^\n]+)/i,
    /Chief\s+([^\n]+)/i,

    // Clinical specializations
    /Clinical\s+([^\n]+)/i,
    /Specialist\s+in\s+([^\n]+)/i,
    /Specializes\s+in\s+([^\n]+)/i,
  ];

  // Process each line for speaker and profile detection
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) continue;

    // Detect speakers
    for (const pattern of speakerPatterns_array) {
      const match = trimmedLine.match(pattern);
      if (match && match[1]) {
        const speaker = match[1].trim();
        if (speaker.length > 1 && speaker.length < 50) {
          // Reasonable length check
          speakerPatterns.add(speaker);
        }
      }
    }

    // Detect profile information
    for (const pattern of profilePatterns) {
      const match = trimmedLine.match(pattern);
      if (match && trimmedLine.length < 200) {
        // Avoid very long lines
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

**STEP 2: COMPREHENSIVE PROFILE EXTRACTION**
1. **EXTRACT DETAILED PROFILES** for each respondent:
   - **Geographic**: Country, region, city, location identifiers
   - **Professional**: Segment, specialty, department, institution type
   - **Experience**: Years of experience, seniority level, background
   - **Usage**: Product usage patterns, preferences, current practices
   - **Institutional**: Hospital grade, practice type, organizational role
   - **Clinical**: Specialization areas, patient types, clinical focus
2. **SEARCH FOR PROFILE INDICATORS**:
   - "I am the Director of...", "I work as a...", "My role is..."
   - "With 15 years of experience...", "I've been practicing for..."
   - "At our Grade A hospital...", "In our tertiary care center..."
   - "I specialize in...", "My focus area is...", "I primarily work with..."

**STEP 3: ADVANCED RESPONSE EXTRACTION**
1. **EXTRACT SUBSTANTIAL QUOTES** (50-150 words minimum)
   - Capture complete thoughts and context
   - Include professional terminology and expertise indicators
   - Preserve emotional tone and conviction level
2. **COMPREHENSIVE SUMMARIES** (3-4 sentences)
   - Strategic implications and deeper meaning
   - Professional perspective and expertise level
   - Context within their role and experience
3. **DYNAMIC THEME GENERATION**
   - Capture 'why' and 'so what' from responses
   - Reflect respondent's unique perspective and drivers
   - Actionable and specific to their professional context

**STEP 4: DISCUSSION GUIDE ALIGNMENT**
1. **FOLLOW GUIDE ORDER** - not transcript conversation flow
2. **MAP EACH RESPONSE** to its proper discussion guide question
3. **MAINTAIN HIERARCHY** - Section → Subsection → Question → Response
4. **SHOW COVERAGE GAPS** - blank cells where respondents didn't address specific questions

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

🎯 **QUALITY REQUIREMENTS**:
- Create detailed, accurate respondent profiles using detected information
- Extract substantial, verbatim quotes that demonstrate expertise and insight
- Maintain strict discussion guide order and hierarchy
- Generate dynamic, respondent-specific themes that capture strategic implications
- Show blanks for unanswered questions - don't drop rows from the matrix
- Ensure complete coverage - every guide question must appear in output
`;
};

// Helper function to extract discussion guide structure with enhanced detection
const extractDiscussionGuideStructure = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  let guideContent = "";
  let detectedStructure = [];

  // Check project guide_context first
  if (projectConfig.guide_context && projectConfig.guide_context.trim()) {
    guideContent = projectConfig.guide_context;
    console.log("Found discussion guide in project settings");
  } else {
    // Enhanced guide structure detection in transcript content
    const combinedContent = transcriptTexts.join("\n\n");

    // Advanced patterns for comprehensive guide extraction
    const guidePatterns = {
      // Main sections - multiple formats
      sections: [
        /Section\s+[A-Z]\s*[-–]\s*[^\n]+/gi,
        /Section\s+\d+[\s\-:]*[^–\n]+/gi,
        /^\s*[A-Z]\.\s+[A-Z][^\n]+$/gm,
        /^\s*\d+\.\s+[A-Z][^\n]+$/gm,
      ],
      // Subsections and categories
      subsections: [
        /^\s*\d+\.\s*[A-Z][A-Z\s/]+$/gm,
        /^\s*[a-z]\)\s*[A-Z][^\n]+$/gm,
        /^\s*[IVX]+\.\s*[A-Z][^\n]+$/gm,
      ],
      // Question patterns
      questions: [
        /^[A-Z][^\n]*\?$/gm,
        /Moderator:\s*[^\n]+\?/gi,
        /Interviewer:\s*[^\n]+\?/gi,
        /^\s*Q\d*[:\.]\s*[^\n]+\?/gm,
      ],
    };

    // Extract all patterns
    let allSections = [];
    let allSubsections = [];
    let allQuestions = [];

    // Process sections
    guidePatterns.sections.forEach((pattern) => {
      const matches = combinedContent.match(pattern) || [];
      allSections.push(...matches);
    });

    // Process subsections
    guidePatterns.subsections.forEach((pattern) => {
      const matches = combinedContent.match(pattern) || [];
      allSubsections.push(...matches);
    });

    // Process questions
    guidePatterns.questions.forEach((pattern) => {
      const matches = combinedContent.match(pattern) || [];
      allQuestions.push(...matches);
    });

    // Remove duplicates and clean
    allSections = [...new Set(allSections)].map((s) => s.trim());
    allSubsections = [...new Set(allSubsections)].map((s) => s.trim());
    allQuestions = [...new Set(allQuestions)].map((s) => s.trim());

    // Build structured output
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
    // Enhanced default structure based on common research patterns
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

💡 **MATRIX ORGANIZATION EXAMPLE**:
- Section B - Core Topic Exploration
  - 1. CURRENT PRACTICES
    - "What are your current approaches to [topic]?"
      - Respondent 1: [QUOTE] [SUMMARY] [THEME]
      - Respondent 2: [QUOTE] [SUMMARY] [THEME]
      - Respondent 3: [blank if no response]
    - "How do you make decisions about [topic]?"
      - Respondent 1: [QUOTE] [SUMMARY] [THEME]
      - Respondent 2: [QUOTE] [SUMMARY] [THEME]
      - Respondent 3: [QUOTE] [SUMMARY] [THEME]

This structure ensures complete coverage and proper alignment.
`;
};

// Generic FMR Prompt (for basic analysis based on project type)
const createBasicAnalysisPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior healthcare qualitative research strategist at FMR Global Health working for top-tier consulting clients.

🎯 **CRITICAL MISSION**: Extract REAL content from the provided transcripts. You must find actual interviewer questions and actual respondent answers. DO NOT create generic responses.

${detectRespondentsFromTranscript(transcriptContent)}

${extractDiscussionGuideStructure(projectConfig, transcriptTexts)}

---

📁 **PROJECT CONFIGURATION**
- Project Name: ${projectConfig.name}
- Stakeholder Type: ${projectConfig.stakeholder_type || "Not specified"}
- Country: ${projectConfig.country || "Not specified"}
- Therapy Area: ${projectConfig.therapy_area || "Not specified"}
- Project Type: ${projectConfig.project_type || "Not specified"}

---

📋 **MANDATORY PROCESS**:

**STEP 1: TRANSCRIPT CONTENT EXTRACTION**
- Read through EVERY line of the transcript text provided below
- Identify ACTUAL interviewer questions (look for "Interviewer:", "Moderator:", "Q:", questions with "?", etc.)
- Identify ACTUAL respondent answers (look for "Respondent:", "Patient:", "Doctor:", "R1:", "P1:", speaker names, etc.)
- Extract EXACT text - do not paraphrase or create fictional content

**STEP 2: RESPONDENT IDENTIFICATION**
- Use actual speaker labels from transcript (Dr. Smith, Patient A, Respondent 1, etc.)
- If no clear labels, create logical IDs based on content patterns
- Note any demographic or professional information mentioned

**STEP 3: QUESTION-RESPONSE MAPPING**
- Match each interviewer question with corresponding respondent answers
- Group questions by topic/section when clear patterns exist
- Preserve original question wording

**STEP 4: INSIGHT EXTRACTION**
For each question-response pair:
- **Quote**: Extract 30-100 words VERBATIM from respondent's actual answer
- **Summary**: 2-3 sentences explaining what this reveals about the respondent's perspective
- **Theme**: Specific, actionable theme based on the actual response content

**CRITICAL REQUIREMENTS**:
❌ NEVER use "No specific quote available", "No quote available", or "General Response"
❌ NEVER create generic, placeholder, or fictional content
❌ NEVER assume or invent content not present in the transcript
✅ ALWAYS extract actual verbatim quotes from the provided transcript
✅ ALWAYS base summaries on real respondent statements
✅ ALWAYS create specific, meaningful themes
✅ ALWAYS use actual question text from the transcript
✅ ALWAYS ensure fmr_dish has questions array with proper structure

📌 **REQUIRED OUTPUT FORMAT**:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Basic Analysis",
    "description": "Qualitative insights from actual transcript content based on project type: ${projectConfig.project_type || "basic"}",
    "questions": [
      {
        "question_type": "[Section/Category from transcript]",
        "question": "[Exact interviewer question from transcript]",
        "respondents": {
          "[Actual Respondent ID]": {
            "quote": "[Exact verbatim from transcript - 30-100 words]",
            "summary": "[2-3 sentences explaining the insight]",
            "theme": "[Specific theme based on response content]"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Mode-Specific Analysis",
    "description": "Analysis based on project type: ${projectConfig.project_type}",
    "table": [
      {
        "category": "Analysis category",
        "finding": "Key finding",
        "evidence": "Supporting evidence",
        "quote": "Supporting verbatim quote"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes",
    "description": "High-level themes from actual transcript insights",
    "table": [
      {
        "theme": "[Specific theme from analysis]",
        "rationale": "[Why this theme matters based on transcript content]",
        "supporting_quotes": "[Actual quotes supporting this theme]"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary",
    "description": "Key insights and recommendations",
    "content": "[300-600 word summary based on actual transcript insights]"
  }
}

🚨 **QUALITY VERIFICATION**:
1. Every quote must be actual verbatim from the transcript
2. Every summary must be based on real respondent statements
3. Every theme must be specific and meaningful
4. Every question must be from the actual transcript
5. If transcript content is unclear, extract what you can but DO NOT invent content
6. ALWAYS ensure the fmr_dish structure has a questions array

📥 **TRANSCRIPT CONTENT TO ANALYZE**:
${transcriptContent}`;
};

// Fallback function to create structured analysis from unstructured text
const createFallbackAnalysis = (rawText: string) => {
  console.log("Creating fallback analysis from raw text");

  // Create proper structure that matches frontend expectations
  const sections = {
    fmr_dish: {
      title: "FMR Dish Analysis - Basic Analysis",
      description: "Analysis organized by question flow and respondents",
      questions: [], // Empty array instead of content string
    },
    mode_analysis: {
      title: "Mode Analysis",
      description: "Mode-specific analysis",
      table: [], // Empty array instead of content string
    },
    strategic_themes: {
      title: "Strategic Themes",
      description: "Strategic insights and recommendations",
      table: [], // Empty array instead of content string
    },
    summary: {
      title: "Summary",
      description: "Executive summary",
      content:
        rawText && rawText.trim() ? rawText.trim() : "Analysis not available",
    },
  };

  return sections;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { project_id, transcript_ids } = await req.json();

    if (!project_id) {
      throw new Error("Project ID is required");
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

    // Fetch documents for this project
    let documentQuery = supabaseService
      .from("research_documents")
      .select("*")
      .eq("user_id", user.id);

    if (transcript_ids && transcript_ids.length > 0) {
      documentQuery = documentQuery.in("id", transcript_ids);
    } else {
      documentQuery = documentQuery.eq("project_id", project_id);
    }

    const { data: documents, error: documentError } = await documentQuery;

    if (documentError) {
      throw new Error(`Failed to fetch documents: ${documentError.message}`);
    }

    if (!documents || documents.length === 0) {
      throw new Error("No documents found for analysis");
    }

    // Extract document content
    const transcriptTexts = documents
      .filter((d) => d.content && d.content.trim())
      .map((d) => d.content);

    if (transcriptTexts.length === 0) {
      throw new Error("No valid document content found for analysis");
    }

    // Log transcript content for debugging
    console.log(`Found ${transcriptTexts.length} documents for basic analysis`);
    transcriptTexts.forEach((text, index) => {
      console.log(`Document ${index + 1} length: ${text.length} characters`);
    });

    // Validate transcript content quality
    const combinedContent = transcriptTexts.join(" ");
    if (combinedContent.length < 100) {
      throw new Error("Transcript content too short for meaningful analysis");
    }

    // Check for basic interview structure
    const hasQuestions = /\?|question|Q:|interviewer|moderator/i.test(
      combinedContent,
    );
    const hasResponses = /respondent|patient|doctor|answer|response/i.test(
      combinedContent,
    );

    console.log("Content validation:", {
      totalLength: combinedContent.length,
      hasQuestions,
      hasResponses,
      documentCount: transcriptTexts.length,
    });

    if (!hasQuestions && !hasResponses) {
      console.warn(
        "Warning: Transcript may not contain clear interview structure",
      );
    }

    // Get Azure OpenAI credentials
    const azureApiKey = Deno.env.get("FMR_AZURE_OPENAI_API_KEY");
    const azureEndpoint = Deno.env.get("FMR_AZURE_OPENAI_ENDPOINT");
    const azureDeployment =
      Deno.env.get("FMR_AZURE_OPENAI_DEPLOYMENT") || "gpt-4";
    const azureVersion =
      Deno.env.get("FMR_AZURE_OPENAI_VERSION") || "2024-02-15-preview";

    if (!azureApiKey || !azureEndpoint) {
      throw new Error("Azure OpenAI credentials not configured");
    }

    // Create basic analysis prompt based on project type
    const prompt = createBasicAnalysisPrompt(project, transcriptTexts);
    const systemMessage =
      "You are an expert qualitative research analyst specializing in Basic Analysis based on project type. Extract insights from transcripts and return structured JSON analysis with fmr_dish structure. Focus on extracting real content from the provided transcripts. Return only valid JSON with the specified structure. Do not include any text before or after the JSON.";

    console.log(
      "Using basic analysis prompt for project type:",
      project.project_type,
    );
    console.log("Sending basic analysis request to Azure OpenAI...");

    // Call Azure OpenAI with correct endpoint format
    const apiUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureVersion}`;
    console.log("API URL:", apiUrl);

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

    console.log("Basic analysis completed successfully");
    console.log("Raw response length:", analysisResultText.length);
    console.log("Response preview:", analysisResultText.substring(0, 500));

    // Clean and validate the JSON response
    let analysisResult;
    try {
      // Clean the response text
      let cleanedText = analysisResultText.trim();

      console.log(
        "Raw AI response (first 1000 chars):",
        cleanedText.substring(0, 1000),
      );

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
        console.error("No valid JSON boundaries found in response");
        throw new Error("No valid JSON object found in response");
      }

      const jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);
      console.log("Extracted JSON length:", jsonText.length);

      // Attempt to parse the JSON
      analysisResult = JSON.parse(jsonText);

      console.log("Parsed JSON structure:", Object.keys(analysisResult));

      // Validate the structure
      if (!analysisResult || typeof analysisResult !== "object") {
        throw new Error("Parsed result is not a valid object");
      }

      // Ensure required sections exist for basic analysis
      if (!analysisResult.fmr_dish) {
        analysisResult.fmr_dish = {
          title: "FMR Dish Analysis - Basic Analysis",
          description:
            "Analysis based on project type: " +
            (project.project_type || "basic"),
          questions: [],
        };
      }

      // Ensure fmr_dish has questions array structure
      if (analysisResult.fmr_dish && !analysisResult.fmr_dish.questions) {
        analysisResult.fmr_dish.questions = [];
      }

      if (!analysisResult.mode_analysis) {
        analysisResult.mode_analysis = {
          title: "Mode Analysis",
          description: "Mode-specific analysis",
          table: [],
        };
      }
      if (!analysisResult.strategic_themes) {
        analysisResult.strategic_themes = {
          title: "Strategic Themes",
          description: "Strategic insights and recommendations",
          table: [],
        };
      }
      if (!analysisResult.summary) {
        analysisResult.summary = {
          title: "Summary",
          description: "Executive summary",
          content: "Analysis not available",
        };
      }

      // Ensure arrays exist for all table structures
      if (
        analysisResult.mode_analysis &&
        !Array.isArray(analysisResult.mode_analysis.table)
      ) {
        analysisResult.mode_analysis.table = [];
      }
      if (
        analysisResult.strategic_themes &&
        !Array.isArray(analysisResult.strategic_themes.table)
      ) {
        analysisResult.strategic_themes.table = [];
      }

      console.log("Successfully parsed and validated basic analysis result");
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.error("Raw response causing error:", analysisResultText);

      // Enhanced fallback: try to extract meaningful content
      let fallbackContent = analysisResultText;

      // Try to extract content between JSON markers if they exist
      const jsonMatch = analysisResultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fallbackContent = jsonMatch[0];
        console.log(
          "Found potential JSON content, attempting secondary parse...",
        );

        try {
          // Try one more time with the extracted content
          analysisResult = JSON.parse(fallbackContent);
          console.log("Secondary parse successful!");
        } catch (secondaryError) {
          console.error("Secondary parse also failed:", secondaryError);
          // Final fallback: structured text response
          analysisResult = createFallbackAnalysis(analysisResultText);
        }
      } else {
        // No JSON structure found, create fallback
        analysisResult = createFallbackAnalysis(analysisResultText);
      }
    }

    // Store analysis result in database
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
          "Warning: Failed to update analysis result:",
          updateError,
        );
      } else {
        analysisRecord = data;
        console.log("Successfully updated basic analysis result in database");
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
        console.error("Warning: Failed to store analysis result:", insertError);
      } else {
        analysisRecord = data;
        console.log("Successfully stored basic analysis result in database");
      }
    }

    // Also update project timestamp
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

    // Final response
    const responseData = {
      success: true,
      analysis: analysisResult,
      project: project,
      documents_analyzed: documents.length,
      timestamp: new Date().toISOString(),
      stored: !!analysisRecord,
      analysis_type: "basic",
    };

    console.log("=== BASIC ANALYSIS RESPONSE DEBUG ===");
    console.log("Response analysis type:", responseData.analysis_type);
    console.log("Analysis structure keys:", Object.keys(analysisResult));

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in basic analysis function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
