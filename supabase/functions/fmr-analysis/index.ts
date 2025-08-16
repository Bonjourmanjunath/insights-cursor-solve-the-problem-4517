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

// Universal Content Analysis Prompt Template (Enhanced Discussion Guide-First Approach)
const createUniversalContentAnalysisPrompt = (
  transcriptTexts: string[],
  projectConfig: any,
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior qualitative research strategist at FMR Global Health, working inside the AI-powered Transcript Intelligence Dashboard.

Your task is to perform **Discussion Guide-First Content Analysis** - a sophisticated matrix analysis that follows the exact discussion guide order, produces verbatim quotes, detailed summaries, and dynamic themes.

${detectRespondentsFromTranscript(transcriptContent)}

${extractDiscussionGuideStructure(projectConfig, transcriptTexts)}

---

🎯 **CRITICAL MISSION**: Create a comprehensive content analysis matrix that follows the discussion guide structure exactly.

📋 **STEP-BY-STEP PROCESS**:

**STEP 1: DISCUSSION GUIDE EXTRACTION**
- Read and understand the complete discussion guide structure from the transcript content
- Look for patterns like "Section A", "Section B", "Question 1:", "Q:", etc.
- Identify all sections, subsections, and individual questions
- Maintain the exact hierarchical order

**STEP 2: COMPREHENSIVE RESPONDENT MAPPING**
- Identify all unique respondents across all transcripts (Respondent 1, Patient A, Doctor, HCP-01, etc.)
- Extract detailed profiles for each respondent from their responses
- Use consistent identifiers throughout the analysis

**STEP 3: SYSTEMATIC CONTENT EXTRACTION**
For each discussion guide question found:
- Search ALL transcripts for relevant responses to that specific question
- Extract substantial verbatim quotes (50-150 words) - MUST be actual text from transcripts
- Create detailed summaries (3-4 sentences) explaining what the respondent revealed
- Generate dynamic, specific themes that capture the strategic insight
- Show blank responses where no answer exists for that respondent

**STEP 4: MATRIX CONSTRUCTION**
- Follow exact discussion guide order as found in transcripts
- Include every question from the guide that was asked
- Map all respondent answers to appropriate questions
- Maintain consistent structure throughout

---

📌 **CRITICAL OUTPUT FORMAT**:

You MUST return ONLY a valid JSON object with this EXACT structure:
{
  "content_analysis": {
    "title": "Discussion Guide-First Content Analysis",
    "description": "Matrix analysis following exact discussion guide structure",
    "questions": [
      {
        "question_type": "Section/Category from discussion guide (e.g., 'Section A - Background', 'Main Discussion', 'Warm-up')",
        "question": "Exact question text found in transcript (e.g., 'How would you describe your experience with...')",
        "respondents": {
          "Respondent-01": {
            "quote": "Exact verbatim quote from transcript - 50-150 words - MUST be actual transcript text",
            "summary": "Detailed summary explaining the insight and context in 3-4 sentences",
            "theme": "Dynamic, specific theme capturing 'why' and 'so what' from this response"
          },
          "Respondent-02": {
            "quote": "Another exact verbatim quote from different respondent - MUST be actual transcript text",
            "summary": "Different perspective and insight summary in 3-4 sentences",
            "theme": "Unique theme for this respondent's perspective"
          }
        }
      }
    ]
  }
}

📌 **CRITICAL REQUIREMENTS**:
- NEVER return fmr_dish, mode_analysis, strategic_themes, or summary structures - this is CONTENT ANALYSIS ONLY
- Every quote MUST be actual verbatim text from the provided transcripts
- Every summary must provide strategic context and insight
- Every theme must be specific and actionable
- Extract actual questions asked in the interviews from the transcript text
- Use actual respondent identifiers found in transcripts (or create consistent ones)
- Return ONLY the JSON object with content_analysis structure, no additional text before or after
- Do NOT include any markdown formatting or code blocks
- IGNORE PROJECT TYPE - Content Analysis is independent of project type
- DO NOT use any FAR DISH logic or structure
- ONLY return content_analysis object - no other structures allowed

📥 **TRANSCRIPT CONTENT TO ANALYZE**:
${transcriptContent}`;
};

// Patient Journey Analysis Prompt Template
const createPatientJourneyPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior healthcare qualitative strategist working inside FMR Global Health's AI-powered Transcript Intelligence Dashboard.

Your task is to analyze **patient journey interview transcripts** with patients, caregivers, or healthcare providers. These transcripts capture personal experiences across diagnosis, treatment, and long-term management — emotionally and clinically.

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 **Mode: patient_journey**  
Study Focus: Mapping the real-world experience of patients from pre-diagnosis through treatment and ongoing care. Identify clinical, emotional, social, and behavioral dimensions of the journey.

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Not specified"}**
🌍 **Geographic Context: ${projectConfig.country || "Not specified"}**

---

📊 **FMR Dish Analysis** (MATRIX STRUCTURE):
Extract questions and organize responses by detected respondents. For each question, identify:
1. Question Type (Warm-up, Main Discussion, Follow-up, Closing)
2. Actual interview question from transcript
3. Respondent responses with Quote, Summary, and Theme for each

Auto-detect respondents from transcript and use actual names where available, otherwise use format like Patient-01, HCP-01, etc.

📝 **Patient Journey Analysis**:
Map the patient experience across journey stages with detailed insights.

📝 **Executive Summary**:
Write a 300-600 word summary highlighting journey-specific insights, critical decision points, emotional shifts, cultural context from ${projectConfig.country || "this market"}, and clinical implications for ${projectConfig.therapy_area || "healthcare"}.

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Patient Journey",
    "description": "Patient journey insights organized by question flow and respondents",
    "questions": [
      {
        "question_type": "Warm-up",
        "question": "Like any question that are asked before the main discussion starts",
        "respondents": {
          "Patient-01": {
            "quote": "Actual quote from transcript showing patient response",
            "summary": "Brief summary of patient's response and context",
            "theme": "Key theme identified from this response"
          },
          "Patient-02": {
            "quote": "Another patient's verbatim response to this question",
            "summary": "Summary of second patient's perspective",
            "theme": "Theme from second patient response"
          },
          "HCP-01": {
            "quote": "Healthcare provider's response if present",
            "summary": "Summary of HCP perspective",
            "theme": "HCP-related theme"
          }
        }
      },
      {
        "question_type": "Main Discussion",
        "question": "Core question about patient journey experience",
        "respondents": {
          "Patient-01": {
            "quote": "Patient verbatim about journey experience",
            "summary": "Key insights from patient journey",
            "theme": "Journey-related theme"
          },
          "Patient-02": {
            "quote": "Second patient's journey experience",
            "summary": "Different perspective on journey",
            "theme": "Alternative journey theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Patient Journey Analysis",
    "description": "Detailed patient experience mapping across journey stages",
    "table": [
      {
        "journey_stage": "Journey stage name",
        "description": "Description of experience at this stage",
        "emotion": "Emotional state",
        "quote": "Supporting verbatim",
        "barrier_friction": "What made it difficult",
        "coping_support": "How they coped or who helped",
        "system_interaction": "Healthcare system touchpoints",
        "identity_impact": "Impact on self-perception"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - Patient Journey",
    "description": "Patient journey-specific strategic insights for ${projectConfig.therapy_area || "healthcare"} optimization",
    "table": [
      {
        "theme": "Patient journey-related strategic theme",
        "rationale": "Why this matters for patient experience optimization",
        "supporting_quotes": "Key supporting quotes from journey analysis"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - Patient Journey",
    "description": "Patient journey insights and optimization recommendations",
    "content": "300-600 word narrative focusing on journey friction points and opportunities"
  }
}

📌 RULES:
- Focus specifically on patient journey progression and emotional evolution
- Extract journey-specific system and emotional insights
- Include therapy area and country context in all analysis
- Use clean double quotes: "..." for verbatim
- Return ONLY the JSON object, no additional text
- Ensure all 8 patient journey fields are populated for each stage

📥 Transcript(s): ${transcriptContent}`;
};

// Diagnostic Pathway Analysis Prompt Template
const createDiagnosticPathwayPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior healthcare qualitative strategist working inside FMR Global Health's AI-powered Transcript Intelligence Dashboard.

Your task is to analyze **diagnostic pathway interview transcripts** to track how patients and healthcare providers navigate the diagnosis process. These transcripts reveal system friction, delays, misdiagnoses, and patient-HCP interactions.

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 **Mode: diagnostic_pathway**  
Study Focus: Mapping the step-by-step diagnostic process from first symptoms to final diagnosis. Identify delays, system barriers, and opportunities for diagnostic improvement.

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Not specified"}**
🌍 **Geographic Context: ${projectConfig.country || "Not specified"}**

---

📊 **FMR Dish Analysis** (NEW STRUCTURE):
Extract questions and organize responses by detected respondents. For each question, identify:
1. Question Type (Warm-up, Main Discussion, Follow-up, Closing)
2. Actual interview question from transcript
3. Respondent responses with Quote, Summary, and Theme for each

Auto-detect respondents from transcript and use actual names where available, otherwise use format like Patient-01, HCP-01, etc.

📝 **Diagnostic Pathway Analysis**:
Step-by-step diagnostic timeline mapping with system friction points.

📝 **Executive Summary**:
Write a 300-600 word summary highlighting diagnostic-specific insights, delay points, system friction, cultural context from ${projectConfig.country || "this market"}, and clinical implications for ${projectConfig.therapy_area || "healthcare"}.

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Diagnostic Pathway",
    "description": "Diagnostic pathway insights organized by question flow and respondents",
    "questions": [
      {
        "question_type": "Warm-up",
        "question": "Initial questions about symptom recognition",
        "respondents": {
          "Patient-01": {
            "quote": "Actual quote about early symptoms or diagnostic experience",
            "summary": "Brief summary of patient's diagnostic journey start",
            "theme": "Diagnostic awareness theme"
          },
          "HCP-01": {
            "quote": "Healthcare provider's perspective on diagnostic process",
            "summary": "Summary of HCP diagnostic approach",
            "theme": "Clinical diagnostic theme"
          }
        }
      },
      {
        "question_type": "Main Discussion",
        "question": "Core questions about diagnostic pathway experience",
        "respondents": {
          "Patient-01": {
            "quote": "Patient verbatim about diagnostic journey",
            "summary": "Key insights from diagnostic experience",
            "theme": "Diagnostic pathway theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Diagnostic Pathway Analysis",
    "description": "Key diagnostic pathway insights",
    "table": [
      {
        "step_type": "Type of diagnostic step",
        "action_taken": "What was done at this step",
        "delay": "Was this step delayed (Y/N)",
        "emotion": "Emotional state",
        "trigger": "What prompted this step",
        "test_assessment": "Tests or assessments performed",
        "clinical_impact": "Consequences of this step",
        "system_friction": "System-level challenges",
        "quote": "Supporting verbatim quote"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - Diagnostic Pathway",
    "description": "Diagnostic pathway-specific strategic insights for ${projectConfig.therapy_area || "healthcare"} optimization",
    "table": [
      {
        "theme": "Diagnostic pathway-related strategic theme",
        "rationale": "Why this matters for diagnostic process optimization",
        "supporting_quotes": "Key supporting quotes from diagnostic analysis"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - Diagnostic Pathway",
    "description": "Diagnostic pathway insights and optimization recommendations",
    "content": "300-600 word narrative focusing on diagnostic delays, system friction, and improvement opportunities"
  }
}

📌 RULES:
- Focus specifically on diagnostic pathway progression and delays
- Extract diagnostic-specific system and emotional insights
- Include therapy area and country context in all analysis
- Use clean double quotes: "..." for verbatim
- Return ONLY the JSON object, no additional text
- Ensure all 9 diagnostic pathway fields are populated for each step

📥 Transcript(s): ${transcriptContent}`;
};

// Customer Journey Analysis Prompt Template
const createCustomerJourneyPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior qualitative research strategist at FMR Global Health.

Your task is to analyze interview transcripts from patients, healthcare professionals (HCPs), or payers to map their full **Customer Journey** across 5 core stages:
**Awareness → Consideration → Initiation → Adoption → Adherence**

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 Mode: \`customer_journey\`
Therapy Area: ${projectConfig.therapy_area || "Not specified"}
Country: ${projectConfig.country || "Not specified"}

---

📊 **FMR Dish Analysis** (NEW STRUCTURE):
Extract questions and organize responses by detected respondents. Focus on customer journey touchpoints and decision-making moments.

Auto-detect respondents from transcript and use actual names where available, otherwise use format like Patient-01, HCP-01, etc.

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Customer Journey",
    "description": "Customer journey insights organized by question flow and respondents",
    "questions": [
      {
        "question_type": "Warm-up",
        "question": "Questions about initial awareness or consideration",
        "respondents": {
          "Patient-01": {
            "quote": "Patient's response about journey awareness",
            "summary": "Summary of patient's journey start",
            "theme": "Customer journey theme"
          },
          "HCP-01": {
            "quote": "HCP perspective on customer journey",
            "summary": "Summary of HCP customer journey insights",
            "theme": "Professional journey theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Customer Journey Analysis",
    "description": "Detailed customer journey mapping across 5 stages",
    "table": [
      {
        "stage": "Journey stage (Awareness/Consideration/Initiation/Adoption/Adherence)",
        "action": "What respondent did at this stage",
        "emotion": "Emotional state",
        "touchpoint": "Who or what influenced actions",
        "friction": "What made this stage difficult",
        "quote": "Supporting verbatim",
        "journey_flow": "Did they skip, reverse, or loop stages",
        "duration": "Approximate time spent in the stage",
        "trigger": "What event or insight prompted the transition to the next stage",
        "support_system": "Who helped them emotionally or practically",
        "info_source": "Where they got their information",
        "barrier_overcome": "How they overcame challenges",
        "clinical_relevance": "Implications for therapy area"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - Customer Journey",
    "description": "Customer journey strategic insights",
    "table": [
      {
        "theme": "Customer journey strategic theme",
        "rationale": "Why this matters for journey optimization",
        "supporting_quotes": "Key supporting quotes"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - Customer Journey",
    "description": "Customer journey insights and recommendations",
    "content": "300-600 word narrative focusing on journey optimization opportunities"
  }
}

📌 RULES:
- Focus specifically on customer journey progression through all 5 stages
- Extract journey-specific emotional and behavioral insights
- Include therapy area and country context in all analysis
- Use clean double quotes: "..." for verbatim
- Return ONLY the JSON object, no additional text
- Ensure all 12 journey fields are populated for each stage

📥 Transcript(s): ${transcriptContent}`;
};

// Generic FMR Prompt (for non-customer journey projects)
const createGenericFMRPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior healthcare qualitative research strategist at FMR Global Health working for top-tier consulting clients.

🎯 **CRITICAL MISSION**: Extract REAL content from the provided transcripts. You must find actual interviewer questions and actual respondent answers. DO NOT create generic responses.

${detectRespondentsFromTranscript(transcriptContent)}

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

📈 **MODE-SPECIFIC ANALYSIS**
${getModeSpecificTableFormat(projectConfig.project_type)}

📌 **REQUIRED OUTPUT FORMAT**:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis",
    "description": "Qualitative insights from actual transcript content",
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
      // Structure based on project type
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

// Persona Mapping Analysis Prompt Template
const createPersonaMappingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior healthcare qualitative strategist working inside FMR Global Health's AI-powered Transcript Intelligence Dashboard.

Your task is to analyze **persona-mapping interview transcripts** to extract the psychological, emotional, and behavioral identity of each respondent. These personas will guide messaging, targeting, and user-centered design decisions.

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 **Mode: persona_mapping**  
Study Focus: Understanding individual **traits**, **decision patterns**, **motivators**, **beliefs**, and **barriers** across healthcare roles — patients, HCPs, caregivers, payers.

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Not specified"}**
Anchor all persona logic in therapy-specific considerations:
- Risk perceptions, symptom interpretation, decision inertia
- Motivation to seek or delay care
- Personality triggers for treatment adoption or avoidance
- Emotional burden and coping in ${projectConfig.therapy_area || "healthcare"}
- Impact of condition on self-identity
- Differentiation by patient type or HCP specialty

🌍 **Geographic Context: ${projectConfig.country || "Not specified"}**
Adapt to cultural, societal, and healthcare factors in ${projectConfig.country || "this country"}:
- Communication norms and trust in system
- Emotional openness and stigma
- Role of family vs individual in healthcare decisions
- Attitudes toward pharma, private vs public care
- Decision authority patterns: HCP-led, shared, or patient-driven

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Persona Mapping",
    "description": "Persona mapping insights organized by vashettes for ${projectConfig.therapy_area || "healthcare"} in ${projectConfig.country || "this market"}",
    "questions": [
      {
        "question_type": "Warm-up",
        "question": "Questions about background and context",
        "respondents": {
          "Patient-01": {
            "quote": "Quote revealing personality traits",
            "summary": "Summary of persona characteristics",
            "theme": "Persona theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Persona Mapping Analysis",
    "description": "Detailed persona profiling for each respondent",
    "table": [
      {
        "persona_archetype": "The summary label for this persona",
        "core_traits": "How they view themselves",
        "motivators": "What drives their decisions",
        "barriers": "What holds them back",
        "beliefs": "About healthcare, treatment, system, disease",
        "risk_perception": "Risk-averse, risk-tolerant, neutral",
        "communication_style": "Direct, data-driven, emotional, avoidant, etc.",
        "decision_trigger": "What causes action",
        "trusted_channels": "HCPs, peers, internet, pharma reps, journals",
        "emotional_anchor": "Guilt, pride, hope, denial, shame, etc.",
        "role_in_ecosystem": "Patient, influencer, decision-maker, caregiver, educator",
        "supporting_quotes": "Up to 3 sharp verbatims to justify insights"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - Persona Mapping",
    "description": "Persona-specific strategic insights for ${projectConfig.therapy_area || "healthcare"} stakeholders",
    "table": [
      {
        "theme": "Persona-related strategic theme",
        "rationale": "Why this matters for messaging and targeting",
        "supporting_quotes": "Key supporting quotes from persona analysis"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - Persona Mapping",
    "description": "Persona insights and messaging recommendations",
    "content": "300-600 word narrative focusing on persona archetypes, decision patterns, and communication strategies"
  }
}

📌 RULES:
- Use transcript verbatims only — no assumptions.
- If any field is missing, leave blank.
- Persona archetype name should be descriptive and brand-usable.
- Keep quote formatting clean using straight quotes.
- Language should be clinical, strategic, and human-centered.
- Tailor tone to ${projectConfig.therapy_area || "healthcare"} context.
- Consider local culture and healthcare structures in ${projectConfig.country || "this country"}.
- Do NOT generalize — each persona is unique and transcript-specific.
- Return ONLY the JSON object, no additional text

📥 Transcript(s): ${transcriptContent}`;
};

// Treatment Decision Analysis Prompt Template
const createTreatmentDecisionPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior healthcare qualitative strategist at FMR Global Health.

Your task is to analyze **interview transcripts focused on treatment decision-making**, drawing out respondent motivations, selection criteria, tradeoffs, influencers, and emotional tipping points.

This analysis will help uncover how patients, HCPs, caregivers, or payers evaluate and choose treatments in real-world conditions.

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 **Mode: treatment_decision**  
Study Focus:  
- What led the respondent to choose or reject a treatment?  
- What alternatives were considered, and why rejected?  
- Who influenced the decision (e.g., HCPs, family, online sources)?  
- What risks or fears did they weigh?
- How emotionally difficult was the choice?
- What tradeoffs were consciously made?

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Not specified"}**
Align insights to ${projectConfig.therapy_area || "healthcare"} challenges:
- Mode of action, complexity, or administration burdens
- Emotional readiness for invasive vs non-invasive options
- Cost-benefit perception for chronic or rare disease treatments
- Safety, adherence, and trust in new modalities

🌍 **Geographic Context: ${projectConfig.country || "Not specified"}**
Consider decision-making norms in ${projectConfig.country || "this country"}:
- System-level access and reimbursement challenges
- Risk appetite by region
- Family vs. individual authority in decisions
- Cultural trust in physicians vs pharma

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Treatment Decision",
    "description": "Treatment decision insights organized by question flow and respondents",
    "questions": [
      {
        "question_type": "Main Discussion",
        "question": "Questions about treatment decision factors",
        "respondents": {
          "Patient-01": {
            "quote": "Quote about treatment decision reasoning",
            "summary": "Summary of decision factors",
            "theme": "Treatment decision theme"
          },
          "HCP-01": {
            "quote": "HCP perspective on treatment decisions",
            "summary": "Summary of clinical decision factors",
            "theme": "Clinical decision theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Treatment Decision Analysis",
    "description": "Detailed treatment decision factor mapping",
    "table": [
      {
        "respondent_id": "Respondent identifier",
        "treatment_considered": "Which treatments were discussed or evaluated",
        "final_decision": "What they chose and why",
        "selection_criteria": "Factors that drove the decision",
        "emotional_tradeoffs": "Feelings that were weighed or suppressed",
        "influencers": "Who impacted the decision and how",
        "barriers": "What blocked or delayed decision-making",
        "trigger_point": "What moment triggered action",
        "decision_confidence": "How they feel about the choice in hindsight",
        "supporting_quotes": "2-3 verbatim quotes per insight"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - Treatment Decision",
    "description": "Treatment decision-specific strategic insights for ${projectConfig.therapy_area || "healthcare"} optimization",
    "table": [
      {
        "theme": "Treatment decision-related strategic theme",
        "rationale": "Why this matters for treatment adoption",
        "supporting_quotes": "Key supporting quotes from decision analysis"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - Treatment Decision",
    "description": "Treatment decision insights and optimization recommendations",
    "content": "300-600 word narrative focusing on decision factors, emotional tradeoffs, and adoption strategies"
  }
}

📌 RULES:
- Use only transcript verbatims — no assumptions.
- If info is missing, leave fields blank.
- Keep tone strategic, healthcare-focused, and clinical.
- Contextualize decisions by ${projectConfig.therapy_area || "healthcare"} and ${projectConfig.country || "this country"}.
- Separate emotional vs logical triggers.
- Quotes must be enclosed in straight quotes.
- Use respondent IDs like P001, HCP-002 if no names exist.
- Return ONLY the JSON object, no additional text

📥 Transcript(s): ${transcriptContent}`;
};

// Unmet Needs Analysis Prompt Template
const createUnmetNeedsPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior qualitative healthcare strategist at FMR Global Health.

Your task is to analyze interview transcripts to **identify unmet needs** from the perspective of HCPs, patients, caregivers, or payers.

These needs may be clinical, emotional, logistical, educational, systemic, or digital. Focus on pain points that affect outcomes, trust, and quality of life.

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 **Mode: unmet_needs**  
Study Objective:  
- Identify gaps in treatment, diagnosis, care delivery, or communication  
- Understand consequences of those gaps on health, access, or emotions  
- Prioritize which unmet needs are most urgent or repeated across respondents  
- Extract illustrative quotes to bring each unmet need to life

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Not specified"}**
Focus on therapy-specific frustrations:
- Workflow gaps in diagnosing or managing ${projectConfig.therapy_area || "healthcare"}
- Patient communication needs around ${projectConfig.therapy_area || "healthcare"} symptoms/treatment
- Gaps in education, follow-up, technology, or integration
- Emotional support issues specific to chronic/rare conditions
- Side effects, treatment complexity, or lack of alternatives

🌍 **Geographic Context: ${projectConfig.country || "Not specified"}**
Consider ${projectConfig.country || "this country"}-specific care barriers:
- Access, wait times, reimbursement, bureaucracy
- Public vs private provider challenges
- Systemic breakdowns unique to ${projectConfig.country || "this country"}
- Cultural reluctance to seek certain types of help

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Unmet Needs",
    "description": "Unmet needs insights organized by question flow and respondents",
    "questions": [
      {
        "question_type": "Main Discussion",
        "question": "Questions about gaps and unmet needs",
        "respondents": {
          "Patient-01": {
            "quote": "Quote revealing unmet needs",
            "summary": "Summary of patient needs gaps",
            "theme": "Unmet needs theme"
          },
          "HCP-01": {
            "quote": "HCP perspective on system gaps",
            "summary": "Summary of clinical needs",
            "theme": "Clinical needs theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Unmet Needs Analysis",
    "description": "Comprehensive gaps and needs identification",
    "table": [
      {
        "respondent_id": "Respondent identifier",
        "need_type": "Clinical, Emotional, Logistical, Educational, Systemic, Financial, Digital, Other",
        "theme": "Core topic summary",
        "details": "What is missing and what was expected",
        "impact": "Consequence of this gap",
        "urgency": "High/Medium/Low based on tone and repetition",
        "suggested_fix": "Solution proposed by respondent if any",
        "quote": "Direct quote as evidence"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - Unmet Needs",
    "description": "Unmet needs-specific strategic insights for ${projectConfig.therapy_area || "healthcare"} improvement",
    "table": [
      {
        "theme": "Unmet needs-related strategic theme",
        "rationale": "Why this gap matters for care optimization",
        "supporting_quotes": "Key supporting quotes from needs analysis"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - Unmet Needs",
    "description": "Unmet needs insights and improvement recommendations",
    "content": "300-600 word narrative focusing on care gaps, system friction, and optimization opportunities"
  }
}

📌 RULES:
- Use transcript verbatims only — no assumptions.
- Assign urgency based on repetition, emotion, and consequences.
- One row = one unmet need.
- If multiple unmet needs exist, include multiple rows per respondent.
- Avoid vague labels — be specific in themes and impacts.
- Quotes must be enclosed in straight quotes.
- Adjust framing to match ${projectConfig.therapy_area || "healthcare"} and ${projectConfig.country || "this country"}.
- Return ONLY the JSON object, no additional text

📥 Transcript(s): ${transcriptContent}`;
};

// Behavioral Drivers Analysis Prompt Template
const createBehavioralDriversPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior healthcare qualitative strategist working inside FMR Global Health's AI-powered Transcript Intelligence Dashboard.

Your task is to deeply analyze **interview transcripts focused on behavioral drivers** — including belief systems, habits, cultural conditioning, and emotional triggers behind treatment or care decisions.

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 **Mode: behavioral_drivers**  
Study Focus: Understanding what **motivates or inhibits** healthcare behaviors such as:
- Starting or delaying treatment
- Following through with therapy
- Switching regimens or abandoning care
- Seeking vs. avoiding diagnosis
- Compliance with health protocols

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Not specified"}**
- Cultural beliefs or stigmas linked to ${projectConfig.therapy_area || "healthcare"}
- Myths or misinformation influencing treatment behavior
- Habitual non-compliance reasons for ${projectConfig.therapy_area || "healthcare"}
- Emotional coping linked to symptoms or regimens
- Social norms or patient identity affecting care decisions

🌍 **Geographic Context: ${projectConfig.country || "Not specified"}**
- Social influences unique to ${projectConfig.country || "this country"}
- Religious, cultural, or socioeconomic beliefs
- Regional health behavior patterns
- Influence of traditional medicine or informal advice
- Country-specific caregiver roles or expectations

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - Behavioral Drivers",
    "description": "Behavioral drivers insights organized by question flow and respondents",
    "questions": [
      {
        "question_type": "Main Discussion",
        "question": "Questions about behavior motivations",
        "respondents": {
          "Patient-01": {
            "quote": "Quote revealing behavioral motivations",
            "summary": "Summary of behavioral drivers",
            "theme": "Behavioral theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "Behavioral Drivers Analysis",
    "description": "Deep behavioral motivation mapping",
    "table": [
      {
        "respondent_id": "Respondent identifier",
        "behavior_category": "Treatment seeking, Adherence, Avoidance, Decision-making",
        "driver_type": "Emotional, Logical, Social, Cultural, Economic",
        "belief_system": "Underlying beliefs influencing behavior",
        "emotional_trigger": "Key emotional motivator or barrier",
        "social_influence": "Family, peers, community impact",
        "past_experience": "How history shapes current behavior",
        "perceived_control": "Agency over health decisions",
        "motivational_quote": "Quote showing what drives them",
        "barrier_quote": "Quote showing resistance or barriers"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - Behavioral Drivers",
    "description": "Behavioral drivers-specific strategic insights for ${projectConfig.therapy_area || "healthcare"} behavior change",
    "table": [
      {
        "theme": "Behavioral drivers-related strategic theme",
        "rationale": "Why this behavior pattern matters for outcomes",
        "supporting_quotes": "Key supporting quotes from behavioral analysis"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - Behavioral Drivers",
    "description": "Behavioral insights and behavior change recommendations",
    "content": "300-600 word narrative focusing on behavior patterns, triggers, and optimization strategies"
  }
}

📌 RULES:
- Use direct quotes only.
- Avoid assumptions — leave fields blank if not in transcript.
- Focus on real-world behavior logic and emotional cues.
- Tailor to ${projectConfig.therapy_area || "healthcare"} and ${projectConfig.country || "this country"} specifics.
- Do not include any commentary — structured data only.
- Use one table per respondent.
- Return ONLY the JSON object, no additional text

📥 Transcript(s): ${transcriptContent}`;
};

// KOL Mapping Analysis Prompt Template
const createKOLMappingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
) => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );

  return `You are a senior qualitative research strategist at FMR Global Health, embedded in our AI-powered Transcript Intelligence Dashboard.

Your task is to analyze expert interviews with **Key Opinion Leaders (KOLs)** across therapy areas. These are senior stakeholders such as top physicians, clinical trial leaders, academic experts, or national-level advisors. Their perspectives inform macro strategy, future innovation, and treatment landscapes.

${detectRespondentsFromTranscript(transcriptContent)}

---

🎯 **Mode: kol_mapping**  
Study Focus: Mapping expert strategy and vision around:
- Unmet needs and opportunity gaps
- Scientific landscape evolution
- Treatment paradigm shifts
- Evidence expectations
- Product potential and adoption barriers
- Policy, reimbursement, and system-level influences

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Not specified"}**
Tailor your analysis to include:
- Clinical controversies in ${projectConfig.therapy_area || "healthcare"}
- Data/evidence gaps acknowledged by experts
- Future innovation areas in ${projectConfig.therapy_area || "healthcare"}
- Diagnostic vs. therapeutic priorities
- Stakeholder alignment issues
- Trial readiness and endpoints
- Multi-country treatment consensus

🌍 **Geographic Context: ${projectConfig.country || "Not specified"}**
Include macro-level regional insights:
- National guideline influence in ${projectConfig.country || "this country"}
- Reimbursement strategy complexity
- Regulatory expectations or policy tensions
- Market access constraints
- System-level innovation adoption patterns

---

📌 CRITICAL OUTPUT FORMAT:

You must return your response in valid JSON format with the following structure:
{
  "fmr_dish": {
    "title": "FMR Dish Analysis - KOL Mapping",
    "description": "KOL mapping insights organized by question flow and respondents",
    "questions": [
      {
        "question_type": "Main Discussion",
        "question": "Questions about influential figures and networks",
        "respondents": {
          "HCP-01": {
            "quote": "Quote about influential colleagues or experts",
            "summary": "Summary of KOL influence patterns",
            "theme": "KOL influence theme"
          }
        }
      }
    ]
  },
  "mode_analysis": {
    "title": "KOL Mapping Analysis",
    "description": "Key Opinion Leader influence and network mapping",
    "table": [
      {
        "respondent_id": "Respondent identifier",
        "kol_mentioned": "Name or description of influential figure",
        "kol_type": "Academic, Clinical, Industry, Digital, Peer",
        "influence_area": "Research, Clinical Practice, Education, Policy",
        "influence_mechanism": "How they exert influence",
        "credibility_factors": "What makes them credible",
        "reach_scope": "Local, National, International",
        "relationship_type": "Direct contact, Publications, Conferences, Social media",
        "impact_on_decisions": "How they influence medical decisions",
        "quote": "Supporting verbatim about influence"
      }
    ]
  },
  "strategic_themes": {
    "title": "Strategic Themes - KOL Mapping",
    "description": "KOL mapping strategic insights",
    "table": [
      {
        "theme": "KOL influence theme",
        "rationale": "Why this influence pattern matters",
        "supporting_quotes": "Key supporting quotes"
      }
    ]
  },
  "summary": {
    "title": "Executive Summary - KOL Mapping",
    "description": "KOL mapping insights and engagement recommendations",
    "content": "300-600 word narrative focusing on KOL engagement strategies"
  }
}

📌 RULES:
- Use one table per KOL if possible.
- Prioritize direct verbatims — don't paraphrase quotes.
- If an insight lacks a quote, leave the field blank.
- Keep text concise and strategic — no filler.
- Focus on implications for development, research, or commercialization.
- Avoid repetition — each row should be a unique strategic insight.
- Format as structured data only — no narrative output.
- Return ONLY the JSON object, no additional text

📥 Transcript(s): ${transcriptContent}`;
};

const createProductPositioningPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior qualitative strategist working at FMR Global Health within the Transcript Intelligence Dashboard.

Your job is to analyze qualitative interviews (with HCPs, patients, payers, or KOLs) and extract clear positioning insights for a **specific healthcare product**. This involves identifying how the product is perceived, compared, and valued across key dimensions.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: product_positioning**  
Study Focus: Understand **how this product is positioned** vs competitors across:
- Clinical effectiveness
- Usability or convenience
- Safety or side effect profile
- Emotional reactions
- Communication and messaging
- Market fit and unmet needs

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**  

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Product Positioning Analysis",
    "table": [
      {
        "dimension": "Clinical efficacy, ease of use, safety, emotional fit, value, etc.",
        "perception": "What respondents think about this product",
        "comparison": "How they compare it to alternatives",
        "evidence_reason": "Why they think this",
        "quote": "Verbatim to illustrate the perception",
        "market_fit": "Ideal user, situation, or setting",
        "objections": "Any stated barriers, concerns, hesitations",
        "suggested_positioning": "How product should be framed",
        "strategic_implication": "What this means for sales/messaging",
        "differentiators": "What stands out most to respondent"
      }
    ]
  },
  "mode_analysis": {
    "title": "Positioning Insights",
    "content": "Strategic insights about product positioning"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for positioning strategy"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of positioning analysis"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createProductPotentialPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior qualitative insights strategist at FMR Global Health, working inside the Transcript Intelligence Dashboard.

Your goal is to analyze qualitative interviews and assess the **perceived potential of a new healthcare product** among HCPs, patients, KOLs, or payers.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: product_potential**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Product Potential Analysis",
    "table": [
      {
        "respondent_type": "HCP/Patient/KOL/Payer",
        "interest_level": "High/Medium/Low",
        "intent_to_use": "Yes/No/Conditional",
        "ideal_use_case": "What patient type or situation fits best",
        "perceived_benefits": "What value the product offers",
        "practical_limitations": "What could hinder real-world usage",
        "quote": "Verbatim justifying potential or concerns",
        "conditions_for_adoption": "What needs to change to increase use",
        "fit_with_practice": "Seamless or disruptive",
        "clinical_outcome_belief": "Will this improve results and why",
        "innovation_openness": "Risk appetite for new solutions",
        "market_readiness": "Do they think others are ready",
        "strategic_implication": "What this means for positioning/education/launch"
      }
    ]
  },
  "mode_analysis": {
    "title": "Potential Assessment",
    "content": "Analysis of product potential signals"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for product development"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of product potential"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createMarketPotentialPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior healthcare market strategist at FMR Global Health, using the AI-powered Transcript Intelligence Dashboard.

Your job is to analyze qualitative interviews and assess the **market potential** of a healthcare product — based on clinical, behavioral, infrastructural, and economic context.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: market_potential**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Market Potential Analysis",
    "table": [
      {
        "respondent_type": "KOL/HCP/Patient/Payer",
        "need_recognition": "Is the need well understood",
        "enthusiasm": "Optimistic/hesitant/indifferent",
        "market_timing": "Right time/premature/too late",
        "adoption_drivers": "What will accelerate uptake",
        "adoption_barriers": "What could block market entry",
        "competitors": "Who else is solving this",
        "system_fit": "Can healthcare system support this",
        "education_need": "What do stakeholders need to know",
        "reimbursement": "Payer willingness signals",
        "cultural_frictions": "Attitudinal blockers or trust gaps",
        "quote": "Verbatim proof of belief/concern",
        "risk_level": "Low/Medium/High launch risk",
        "acceleration_suggestions": "What to do to enable entry",
        "strategic_insight": "What this means for GTM planning"
      }
    ]
  },
  "mode_analysis": {
    "title": "Market Assessment",
    "content": "Analysis of market potential indicators"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for market entry"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of market potential"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createMarketUnderstandingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior market intelligence analyst at FMR Global Health, working inside the AI-powered Transcript Intelligence Dashboard.

Your job is to analyze qualitative interview transcripts and assess the **market understanding** of respondents — identifying how well they grasp the therapeutic ecosystem, terminology, product category, treatment landscape, and decision-making logic.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: market_understanding**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Market Understanding Analysis",
    "table": [
      {
        "respondent_type": "HCP/Patient/KOL/Payer",
        "terminology_fluency": "Accurate/Mixed/Poor use of terms",
        "category_understanding": "Do they grasp where product fits",
        "treatment_path_clarity": "Do they understand patient journey",
        "stakeholder_awareness": "Do they understand who does what",
        "policy_reimbursement_insight": "Do they understand payer involvement",
        "misunderstandings": "Signs of confusion or outdated info",
        "mental_model": "How they frame the product space",
        "quote": "Exact transcript quotes supporting findings",
        "knowledge_level": "High/Medium/Low",
        "communication_implications": "What needs clarification or re-education"
      }
    ]
  },
  "mode_analysis": {
    "title": "Understanding Assessment",
    "content": "Analysis of market understanding levels"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for education strategy"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of market understanding"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createLaunchReadinessPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior go-to-market strategist at FMR Global Health, working within the AI-powered Transcript Intelligence Dashboard.

Your job is to analyze qualitative interviews and evaluate the **launch readiness** of a healthcare product — based on stakeholder confidence, infrastructure preparedness, support material needs, and expected adoption trajectory.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: launch_readiness**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Launch Readiness Analysis",
    "table": [
      {
        "stakeholder": "HCP/Patient/Payer type",
        "awareness": "Familiar/Unfamiliar with product",
        "confidence": "High/Medium/Low in using product",
        "training_needs": "What they need to feel ready",
        "support_materials": "Brochures, videos, guides needed",
        "infrastructure_gaps": "Systems/tools/logistics delays",
        "timing_fit": "Good time/Not yet/Too late",
        "adoption_concerns": "Side effects, workflow, adherence issues",
        "early_adopter_profile": "Who might use it first and why",
        "enablers": "What would speed up success",
        "quote": "Exact quotes showing readiness/resistance",
        "launch_probability": "Low/Medium/High success likelihood",
        "next_steps": "Concrete actions needed"
      }
    ]
  },
  "mode_analysis": {
    "title": "Readiness Assessment",
    "content": "Analysis of launch readiness factors"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for launch planning"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of launch readiness"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createMessageTestingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior communications strategist working in the FMR Transcript Intelligence Dashboard for qualitative healthcare research.

Your task is to analyze **interview transcripts** where patients, HCPs, or payers respond to sample messages — to assess message clarity, emotional tone, credibility, and alignment with expectations.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: message_testing**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Message Testing Analysis",
    "table": [
      {
        "message": "The message being tested",
        "clarity": "Clear/Confusing assessment",
        "emotional_reaction": "Hopeful/skeptical/scared/etc",
        "credibility": "Believable/exaggerated assessment",
        "key_phrases": "Words or lines that stood out",
        "language_suggestions": "What they would change",
        "tone_fit": "Too salesy/technical/just right",
        "memorability": "Will they remember this message",
        "message_fit": "Did it match what they care about",
        "quote": "Verbatim reactions"
      }
    ]
  },
  "mode_analysis": {
    "title": "Message Assessment",
    "content": "Analysis of message performance"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for messaging strategy"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of message testing"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createConceptTestingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a healthcare insights strategist embedded in the FMR Transcript Intelligence Dashboard.

Your task is to analyze **concept testing interviews** where stakeholders (patients, HCPs, payers, etc.) respond to early-stage ideas, treatment concepts, communication visuals, or service innovations.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: concept_testing**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Concept Testing Analysis",
    "table": [
      {
        "concept": "The concept being tested",
        "reaction": "Positive/neutral/skeptical first response",
        "clarity": "Did they understand as intended",
        "emotion": "Hope/fear/confusion emotional response",
        "rationale": "Why they responded that way",
        "likes": "What parts stood out as strong",
        "dislikes": "What raised concerns",
        "misunderstandings": "Any misinterpretations",
        "fit_with_needs": "Does this meet an unmet need",
        "feasibility": "Does it feel realistic/implementable",
        "suggestions": "Ideas to refine the concept",
        "quote": "Verbatim lines showing reaction"
      }
    ]
  },
  "mode_analysis": {
    "title": "Concept Assessment",
    "content": "Analysis of concept reception"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for concept development"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of concept testing"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createMaterialTestingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior healthcare research analyst working inside FMR Global Health's Transcript Intelligence Dashboard.

Your task is to analyze stakeholder responses (patients, HCPs, payers, etc.) to **educational or promotional materials** such as brochures, infographics, leave-behinds, portals, PDFs, or presentations.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: material_testing**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Material Testing Analysis",
    "table": [
      {
        "material": "The material being tested",
        "impression": "How it landed on first view",
        "clarity": "Was key message understandable",
        "layout_visuals": "Did structure guide attention well",
        "tone": "Supportive/alarming/professional/dense",
        "hierarchy": "Were important points emphasized",
        "confusing_areas": "What parts weren't clear",
        "credibility": "Trustworthy or over-promising",
        "behavioral_impact": "Likely to influence behavior",
        "suggestions": "What changes would they make",
        "quote": "Transcript verbatims illustrating opinions"
      }
    ]
  },
  "mode_analysis": {
    "title": "Material Assessment",
    "content": "Analysis of material effectiveness"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for material optimization"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of material testing"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createVisualClaimsTestingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior qualitative insights analyst at FMR Global Health, working inside the Transcript Intelligence Dashboard.

Your task is to analyze reactions to **visual elements and accompanying claims** presented in healthcare communications. These visuals may include product images, charts, packaging, infographics, medical device visuals, or brand statements.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: visual_claims_testing**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Visual Claims Testing Analysis",
    "table": [
      {
        "visual_claim": "The visual and claim combination tested",
        "trust": "Credible/staged/realistic/exaggerated",
        "clarity": "Easy to understand message combination",
        "emotion": "Fear/comfort/hope/motivation response",
        "believability": "Truthful/hyped/confusing perception",
        "accuracy_perception": "Evidence-backed or fluffy feeling",
        "cultural_fit": "Appropriate or misaligned culturally",
        "recall": "Would they remember this visual+claim",
        "brand_alignment": "Matched expectations from brand",
        "suggestions": "How to change visual or reword claim",
        "quote": "Transcript quotes supporting insights"
      }
    ]
  },
  "mode_analysis": {
    "title": "Visual Assessment",
    "content": "Analysis of visual and claims impact"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for visual communications"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of visual claims testing"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createStoryFlowPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior qualitative research strategist at FMR Global Health, embedded inside the Transcript Intelligence Dashboard.

Your task is to analyze how healthcare respondents (patients, HCPs, payers) react to **narrative elements** in story-driven materials. This includes patient testimonials, onboarding flows, informational videos, sales aids, digital explainers, and any communication that unfolds as a **sequence**.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: story_flow**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Story Flow Analysis",
    "table": [
      {
        "narrative_flow": "Did story progress logically",
        "emotional_journey": "Emotional highs and lows",
        "message_clarity": "Was key takeaway understood",
        "engaging_moment": "Most captivating or relatable moments",
        "drop_off_point": "Where attention or clarity declined",
        "authenticity": "Genuine or fabricated feeling",
        "trust_impact": "Built or reduced credibility",
        "memorable": "What part stood out most",
        "suggestions": "What would improve flow or tone",
        "quote": "Direct transcript support"
      }
    ]
  },
  "mode_analysis": {
    "title": "Narrative Assessment",
    "content": "Analysis of story effectiveness"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for narrative optimization"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of story flow testing"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createDeviceMessagingPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior healthcare insights analyst at FMR Global Health, working inside the Transcript Intelligence Dashboard.

Your task is to analyze qualitative interviews focused on the **communication and messaging surrounding healthcare devices**. These may include wearables, monitors, diagnostic tools, surgical instruments, inhalers, injection devices, infusion pumps, or digital therapeutics.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: device_messaging**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Device Messaging Analysis",
    "table": [
      {
        "use_clarity": "Was how to use clear and memorable",
        "trust_level": "Did device seem reliable and well-explained",
        "emotion": "Fear/anxiety/confidence/pride reactions",
        "language_tone": "Scientific/accessible/human/robotic",
        "comfort_framing": "Did messaging reduce concerns",
        "safety_perception": "Did users feel it was safe and tested",
        "comparison": "How positioned against alternatives",
        "empowerment": "Empowered or self-conscious feeling",
        "tech_integration": "App/feedback/tech feature perceptions",
        "suggestions": "How to improve messaging or explanation",
        "quote": "Key respondent statements supporting insights"
      }
    ]
  },
  "mode_analysis": {
    "title": "Device Assessment",
    "content": "Analysis of device messaging effectiveness"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for device communications"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of device messaging"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createCoCreationPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior qualitative strategist at FMR Global Health, working in the AI-powered Transcript Intelligence Dashboard.

Your task is to analyze qualitative interviews that explore **co-creation and collaboration** between researchers and stakeholders (patients, HCPs, caregivers, payers) to improve materials, messaging, product design, or experiences.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: co_creation**  
🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Co-Creation Analysis",
    "table": [
      {
        "suggestion": "What changes they recommended",
        "design_feedback": "Comments on layout/content/navigation/colors/images",
        "ownership_emotion": "Did they feel heard and respected",
        "input_tone": "Directive/hesitant/playful/enthusiastic",
        "theme": "Recurring creative directions",
        "language_tip": "Words/phrases they liked or would replace",
        "visual_reaction": "Reactions to medical imagery/data displays",
        "collaboration_depth": "Built on ideas or shut them down",
        "inclusion_signal": "Felt seen as part of design process",
        "quote": "Exact phrasing of creative or collaborative responses"
      }
    ]
  },
  "mode_analysis": {
    "title": "Collaboration Assessment",
    "content": "Analysis of co-creation engagement"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for collaborative design"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of co-creation analysis"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createTouchpointExperiencePrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior qualitative researcher at FMR Global Health, analyzing feedback from interviews focused on specific **touchpoints** in the healthcare experience.

Your job is to map emotional reactions, practical feedback, friction points, and improvement suggestions across the key channels that stakeholders (patients, HCPs, caregivers, payers) interact with.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: touchpoint_experience**  
Study Focus:
- Explore user experiences with defined healthcare touchpoints:
  - **Field rep visits**
  - **Webinars / Events**
  - **Online portals / apps**
  - **Call centers / email / SMS**
  - **Patient support programs**
  - **Training modules**
  - **Content delivery platforms**
- Understand emotional tone, clarity, usefulness, and suggestions for each channel

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Touchpoint Experience Analysis",
    "table": [
      {
        "channel": "Webinar/Field Rep/App/Email/Phone/SMS/Portal etc",
        "role": "Education/support/sales/access/training etc",
        "experience": "Clear/confusing/repetitive/frustrating/efficient",
        "emotion": "Trust/anxiety/relief/annoyance/confusion/appreciation",
        "barrier": "Navigation/access/relevance/tech/tone",
        "suggestion": "What could improve the touchpoint",
        "quote": "Verbatim phrases reflecting user's tone and insight",
        "engagement_impact": "Did it help or hinder brand/therapy engagement",
        "follow_up_need": "Did they want more info or different format"
      }
    ]
  },
  "mode_analysis": {
    "title": "Touchpoint Assessment",
    "content": "Analysis of touchpoint experiences and optimization opportunities"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for touchpoint optimization"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of touchpoint experience analysis"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const createDigitalUsabilityPrompt = (
  projectConfig: any,
  transcriptTexts: string[],
): string => {
  const transcriptContent = transcriptTexts.join(
    "\n\n---TRANSCRIPT SEPARATOR---\n\n",
  );
  return `You are a senior qualitative UX researcher at FMR Global Health. Your task is to analyze interview transcripts where participants (patients, HCPs, payers) discuss their experiences with **digital healthcare tools**.

Your goal is to extract deep insights on usability, clarity, accessibility, and emotional responses to these digital platforms.

${detectRespondentsFromTranscript(transcriptContent)}

🎯 **Mode: digital_usability**  
Study Focus:
- Digital channels like:
  - **Patient portals**
  - **Doctor dashboards**
  - **Support apps**
  - **Websites / content hubs**
  - **Virtual assistant / chatbots**
- Map usability strengths and weaknesses
- Capture suggestions for product design improvements

🏥 **Therapy Area Context: ${projectConfig.therapy_area || "Healthcare"}**  
🌍 **Geographic Context: ${projectConfig.country || "Global"}**

Return ONLY a JSON object with this exact structure:
{
  "fmr_dish": {
    "title": "Digital Usability Analysis",
    "table": [
      {
        "tool": "Portal/app/dashboard/chatbot/website",
        "purpose": "Education/monitoring/support/appointment/data tracking",
        "usability": "Easy to use/confusing/error-prone/slow/intuitive",
        "navigation": "Logical/overwhelming/poorly labeled/redundant steps",
        "trust_security": "Comfort with data privacy/login/health tracking",
        "accessibility": "Device compatibility/screen reader/load times",
        "emotion": "Frustration/trust/anxiety/relief/empowerment",
        "improvement": "UX/UI suggestions in user's words",
        "quote": "Direct phrases expressing experience",
        "impact": "Did tool help or hinder healthcare journey",
        "support": "Onboarding/tutorials/human help/contact center needs"
      }
    ]
  },
  "mode_analysis": {
    "title": "Usability Assessment",
    "content": "Analysis of digital tool usability and user experience"
  },
  "strategic_themes": {
    "title": "Strategic Implications",
    "content": "Strategic insights for digital product optimization"
  },
  "summary": {
    "title": "Summary",
    "content": "Executive summary of digital usability analysis"
  }
}

📥 Transcript(s): ${transcriptContent}`;
};

const getModeSpecificTableFormat = (projectType: string): string => {
  const journeyTypes = [
    "customer_journey",
    "patient_journey",
    "diagnostic_pathway",
  ];
  const personaTypes = ["persona_mapping"];
  const behaviorTypes = [
    "behavioral_drivers",
    "treatment_decision",
    "unmet_needs",
  ];
  const messageTypes = [
    "message_testing",
    "concept_testing",
    "material_testing",
    "visual_claims_testing",
    "story_flow",
    "device_messaging",
    "co_creation",
  ];
  const digitalTypes = ["touchpoint_experience", "digital_usability"];
  const marketTypes = [
    "kol_mapping",
    "launch_readiness",
    "market_potential",
    "market_understanding",
    "product_potential",
    "product_positioning",
  ];

  if (projectType === "customer_journey") {
    return `🔹 **Customer Journey**
Mode-specific table structure for JSON:
[
  {
    "stage": "Stage name (e.g., Awareness, Consideration, Initiation, Adoption, Adherence)",
    "action": "Specific action taken",
    "emotion": "Emotional state",
    "touchpoint": "Interaction point",
    "friction": "What made this stage difficult",
    "quote": "Supporting verbatim quote",
    "journey_flow": "Did they skip, reverse, or loop stages",
    "duration": "Approximate time spent in the stage",
    "trigger": "What event or insight prompted the transition to the next stage",
    "support_system": "Who helped them emotionally or practically",
    "info_source": "Where they got their information",
    "barrier_overcome": "How they overcame challenges",
    "clinical_relevance": "Implications for therapy area"
  }
]`;
  }

  if (projectType === "patient_journey") {
    return `🔹 **Patient Journey**
Mode-specific table structure for JSON:
[
  {
    "journey_stage": "Journey stage name",
    "description": "Description of experience at this stage",
    "emotion": "Emotional state",
    "quote": "Supporting verbatim",
    "barrier_friction": "What made it difficult",
    "coping_support": "How they coped or who helped",
    "system_interaction": "Healthcare system touchpoints",
    "identity_impact": "Impact on self-perception"
  }
]`;
  }

  if (projectType === "diagnostic_pathway") {
    return `🔹 **Diagnostic Pathway**
Mode-specific table structure for JSON:
[
  {
    "step_type": "Type of diagnostic step",
    "action_taken": "What was done at this step",
    "delay": "Was this step delayed (Y/N)",
    "emotion": "Emotional state",
    "trigger": "What prompted this step",
    "test_assessment": "Tests or assessments performed",
    "clinical_impact": "Consequences of this step",
    "system_friction": "System-level challenges",
    "quote": "Supporting verbatim quote"
  }
]`;
  }

  if (projectType === "persona_mapping") {
    return `🔹 **Persona Mapping**
Mode-specific table structure for JSON:
[
  {
    "persona_archetype": "The summary label for this persona",
    "core_traits": "How they view themselves",
    "motivators": "What drives their decisions",
    "barriers": "What holds them back",
    "beliefs": "About healthcare, treatment, system, disease",
    "risk_perception": "Risk-averse, risk-tolerant, neutral",
    "communication_style": "Direct, data-driven, emotional, avoidant, etc.",
    "decision_trigger": "What causes action",
    "trusted_channels": "HCPs, peers, internet, pharma reps, journals",
    "emotional_anchor": "Guilt, pride, hope, denial, shame, etc.",
    "role_in_ecosystem": "Patient, influencer, decision-maker, caregiver, educator",
    "supporting_quotes": "Up to 3 sharp verbatims to justify insights"
  }
]`;
  }

  if (projectType === "treatment_decision") {
    return `🔹 **Treatment Decision**
Mode-specific table structure for JSON:
[
  {
    "respondent_id": "Respondent identifier",
    "treatment_considered": "Which treatments were discussed or evaluated",
    "final_decision": "What they chose and why",
    "selection_criteria": "Factors that drove the decision",
    "emotional_tradeoffs": "Feelings that were weighed or suppressed",
    "influencers": "Who impacted the decision and how",
    "barriers": "What blocked or delayed decision-making",
    "trigger_point": "What moment triggered action",
    "decision_confidence": "How they feel about the choice in hindsight",
    "supporting_quotes": "2-3 verbatim quotes per insight"
  }
]`;
  }

  if (projectType === "unmet_needs") {
    return `🔹 **Unmet Needs**
Mode-specific table structure for JSON:
[
  {
    "respondent_id": "Respondent identifier",
    "need_type": "Clinical, Emotional, Logistical, Educational, Systemic, Financial, Digital, Other",
    "theme": "Core topic summary",
    "details": "What is missing and what was expected",
    "impact": "Consequence of this gap",
    "urgency": "High/Medium/Low based on tone and repetition",
    "suggested_fix": "Solution proposed by respondent if any",
    "quote": "Direct quote as evidence"
  }
]`;
  }

  if (projectType === "behavioral_drivers") {
    return `🔹 **Behavioral Drivers**
Mode-specific table structure for JSON:
[
  {
    "behavior": "Healthcare action or inaction being described",
    "influencer": "Who/what shapes their behavior",
    "belief": "Core belief driving this behavior",
    "trigger": "Specific moment, phrase, or event causing the behavior",
    "quote": "Exact language supporting the insight",
    "emotion": "Underlying emotional tone",
    "resistance_pattern": "Why they reject or hesitate if applicable",
    "social_lens": "Peer behavior or family/cultural influence",
    "behavioral_shift": "Did the behavior change later and why",
    "barrier_type": "Cognitive, emotional, logistical, systemic",
    "impact_on_care": "How this affects adherence or outcomes",
    "communication_need": "What message would help shift the behavior"
  }
]`;
  }

  if (projectType === "kol_mapping") {
    return `🔹 **KOL Mapping**
Mode-specific table structure for JSON:
[
  {
    "theme": "Strategic topic or debate area",
    "perspective": "What the KOL thinks",
    "rationale": "Why they think this",
    "quote": "Direct support for insight",
    "implication": "What this means for development/commercialization",
    "level": "Local, national, or global relevance",
    "consensus": "Outlier opinion or widely held among peers",
    "future_outlook": "Their forecast or vision",
    "unmet_need_highlighted": "Explicit gap noted if any",
    "role_framing": "Academic, trialist, policy shaper, educator"
  }
]`;
  }

  if (projectType === "product_positioning") {
    return `🔹 **Product Positioning**
Mode-specific table structure for JSON:
[
  {
    "dimension": "Clinical efficacy, ease of use, safety, emotional fit, value, etc.",
    "perception": "What respondents think about this product",
    "comparison": "How they compare it to alternatives",
    "evidence_reason": "Why they think this",
    "quote": "Verbatim to illustrate the perception",
    "market_fit": "Ideal user, situation, or setting",
    "objections": "Any stated barriers, concerns, hesitations",
    "suggested_positioning": "How product should be framed",
    "strategic_implication": "What this means for sales/messaging",
    "differentiators": "What stands out most to respondent"
  }
]`;
  }

  if (projectType === "product_potential") {
    return `🔹 **Product Potential**
Mode-specific table structure for JSON:
[
  {
    "respondent_type": "HCP/Patient/KOL/Payer",
    "interest_level": "High/Medium/Low",
    "intent_to_use": "Yes/No/Conditional",
    "ideal_use_case": "What patient type or situation fits best",
    "perceived_benefits": "What value the product offers",
    "practical_limitations": "What could hinder real-world usage",
    "quote": "Verbatim justifying potential or concerns",
    "conditions_for_adoption": "What needs to change to increase use",
    "fit_with_practice": "Seamless or disruptive",
    "clinical_outcome_belief": "Will this improve results and why",
    "innovation_openness": "Risk appetite for new solutions",
    "market_readiness": "Do they think others are ready",
    "strategic_implication": "What this means for positioning/education/launch"
  }
]`;
  }

  if (messageTypes.includes(projectType)) {
    return `🔹 **Message & Material Testing**
(For: \`message_testing\`, \`concept_testing\`, \`material_testing\`, \`visual_claims_testing\`, \`story_flow\`, \`device_messaging\`, \`co_creation\`)
Mode-specific table structure for JSON:
[
  {
    "item": "Message/material tested",
    "reaction": "Initial reaction",
    "emotion": "Emotional response",
    "quote": "Supporting verbatim quote",
    "suggestion": "Improvement suggestion"
  }
]`;
  }

  if (digitalTypes.includes(projectType)) {
    if (projectType === "touchpoint_experience") {
      return `🔹 **Touchpoint Experience**
Mode-specific table structure for JSON:
[
  {
    "channel": "Webinar/Field Rep/App/Email/Phone/SMS/Portal etc",
    "role": "Education/support/sales/access/training etc",
    "experience": "Clear/confusing/repetitive/frustrating/efficient",
    "emotion": "Trust/anxiety/relief/annoyance/confusion/appreciation",
    "barrier": "Navigation/access/relevance/tech/tone",
    "suggestion": "What could improve the touchpoint",
    "quote": "Verbatim phrases reflecting user's tone and insight",
    "engagement_impact": "Did it help or hinder brand/therapy engagement",
    "follow_up_need": "Did they want more info or different format"
  }
]`;
    } else if (projectType === "digital_usability") {
      return `🔹 **Digital Usability**
Mode-specific table structure for JSON:
[
  {
    "tool": "Portal/app/dashboard/chatbot/website",
    "purpose": "Education/monitoring/support/appointment/data tracking",
    "usability": "Easy to use/confusing/error-prone/slow/intuitive",
    "navigation": "Logical/overwhelming/poorly labeled/redundant steps",
    "trust_security": "Comfort with data privacy/login/health tracking",
    "accessibility": "Device compatibility/screen reader/load times",
    "emotion": "Frustration/trust/anxiety/relief/empowerment",
    "improvement": "UX/UI suggestions in user's words",
    "quote": "Direct phrases expressing experience",
    "impact": "Did tool help or hinder healthcare journey",
    "support": "Onboarding/tutorials/human help/contact center needs"
  }
]`;
    }
  }

  if (marketTypes.includes(projectType)) {
    if (projectType === "market_potential") {
      return `🔹 **Market Potential**
Mode-specific table structure for JSON:
[
  {
    "respondent_type": "KOL/HCP/Patient/Payer",
    "need_recognition": "Is the need well understood",
    "enthusiasm": "Optimistic/hesitant/indifferent",
    "market_timing": "Right time/premature/too late",
    "adoption_drivers": "What will accelerate uptake",
    "adoption_barriers": "What could block market entry",
    "competitors": "Who else is solving this",
    "system_fit": "Can healthcare system support this",
    "education_need": "What do stakeholders need to know",
    "reimbursement": "Payer willingness signals",
    "cultural_frictions": "Attitudinal blockers or trust gaps",
    "quote": "Verbatim proof of belief/concern",
    "risk_level": "Low/Medium/High launch risk",
    "acceleration_suggestions": "What to do to enable entry",
    "strategic_insight": "What this means for GTM planning"
  }
]`;
    } else if (projectType === "market_understanding") {
      return `🔹 **Market Understanding**
Mode-specific table structure for JSON:
[
  {
    "respondent_type": "HCP/Patient/KOL/Payer",
    "terminology_fluency": "Accurate/Mixed/Poor use of terms",
    "category_understanding": "Do they grasp where product fits",
    "treatment_path_clarity": "Do they understand patient journey",
    "stakeholder_awareness": "Do they understand who does what",
    "policy_reimbursement_insight": "Do they understand payer involvement",
    "misunderstandings": "Signs of confusion or outdated info",
    "mental_model": "How they frame the product space",
    "quote": "Exact transcript quotes supporting findings",
    "knowledge_level": "High/Medium/Low",
    "communication_implications": "What needs clarification or re-education"
  }
]`;
    } else if (projectType === "launch_readiness") {
      return `🔹 **Launch Readiness**
Mode-specific table structure for JSON:
[
  {
    "stakeholder": "HCP/Patient/Payer type",
    "awareness": "Familiar/Unfamiliar with product",
    "confidence": "High/Medium/Low in using product",
    "training_needs": "What they need to feel ready",
    "support_materials": "Brochures, videos, guides needed",
    "infrastructure_gaps": "Systems/tools/logistics delays",
    "timing_fit": "Good time/Not yet/Too late",
    "adoption_concerns": "Side effects, workflow, adherence issues",
    "early_adopter_profile": "Who might use it first and why",
    "enablers": "What would speed up success",
    "quote": "Exact quotes showing readiness/resistance",
    "launch_probability": "Low/Medium/High success likelihood",
    "next_steps": "Concrete actions needed"
  }
]`;
    } else {
      return `🔹 **Market / Strategic**
Mode-specific table structure for JSON:
[
  {
    "theme": "Strategic theme",
    "opportunity": "Market opportunity",
    "constraint": "Market constraint/barrier",
    "quote": "Supporting verbatim quote"
  }
]`;
    }
  }

  return `🔹 **General Analysis**
Mode-specific table structure for JSON:
[
  {
    "category": "Analysis category",
    "finding": "Key finding",
    "evidence": "Supporting evidence",
    "quote": "Supporting verbatim quote"
  }
]`;
};

// Fallback function to create structured analysis from unstructured text
const createFallbackAnalysis = (rawText: string) => {
  console.log("Creating fallback analysis from raw text");

  // Create proper structure that matches frontend expectations
  const sections = {
    fmr_dish: {
      title: "FMR Dish Analysis",
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

    const { project_id, transcript_ids, analysis_type } = await req.json();

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

    // Fetch documents for this project (changed from transcripts to research_documents)
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

    // Extract document content (from research_documents table, content field)
    const transcriptTexts = documents
      .filter((d) => d.content && d.content.trim())
      .map((d) => d.content);

    if (transcriptTexts.length === 0) {
      throw new Error("No valid document content found for analysis");
    }

    // Log transcript content for debugging
    console.log(`Found ${transcriptTexts.length} documents for analysis`);
    transcriptTexts.forEach((text, index) => {
      console.log(`Document ${index + 1} length: ${text.length} characters`);
      console.log(
        `Document ${index + 1} preview (first 500 chars):`,
        text.substring(0, 500),
      );

      // Check for speaker patterns
      const speakerPatterns = [
        /Respondent\s*\d+:/gi,
        /Patient\s*\d*:/gi,
        /Doctor|Dr\./gi,
        /Interviewer|Moderator:/gi,
        /^[A-Z][a-z]+:/gm,
      ];

      speakerPatterns.forEach((pattern, patternIndex) => {
        const matches = text.match(pattern);
        if (matches) {
          console.log(
            `Document ${index + 1} - Pattern ${patternIndex} matches:`,
            matches.slice(0, 5),
          );
        }
      });
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

    // Create analysis prompt based on analysis type or project type
    let prompt;
    let systemMessage =
      "You are an expert qualitative research analyst. Extract insights from transcripts and return structured JSON analysis. Focus on extracting real content from the provided transcripts. Return only valid JSON with the specified structure. Do not include any text before or after the JSON.";

    // Check if universal content analysis is requested
    if (
      analysis_type === "universal_content_analysis" ||
      analysis_type === "content"
    ) {
      prompt = createUniversalContentAnalysisPrompt(transcriptTexts, project);
      systemMessage =
        "You are an expert qualitative research analyst specializing in Discussion Guide-First Content Analysis. CRITICAL: This is CONTENT ANALYSIS - completely independent of project type and FAR DISH logic. You must extract actual questions from the transcript content and map all transcript responses to those questions. Extract verbatim quotes (50-150 words), detailed summaries, and dynamic themes. Return ONLY valid JSON with the content_analysis structure containing questions array. Each question must have question_type, question, and respondents object. NEVER return fmr_dish, mode_analysis, strategic_themes, or summary structures. IGNORE project type completely. Do not include any text before or after the JSON.";
      console.log(
        "Using CONTENT ANALYSIS - independent of project type and FAR DISH",
      );
    } else if (analysis_type === "pro_advanced") {
      // Pro Advanced Analysis - independent of project type
      prompt = createGenericFMRPrompt(project, transcriptTexts);
      systemMessage =
        "You are an expert qualitative research analyst specializing in Pro Advanced Analysis. This analysis is independent of project type and uses advanced logic built for deep insights. Extract comprehensive insights from transcripts and return structured JSON analysis with fmr_dish structure. Focus on extracting real content from the provided transcripts. Return only valid JSON with the specified structure. Do not include any text before or after the JSON.";
      console.log("Using PRO ADVANCED ANALYSIS - independent of project type");
    } else if (project.project_type === "customer_journey") {
      prompt = createCustomerJourneyPrompt(project, transcriptTexts);
      console.log("Using customer journey analysis prompt");
    } else if (project.project_type === "patient_journey") {
      prompt = createPatientJourneyPrompt(project, transcriptTexts);
      console.log("Using patient journey analysis prompt");
    } else if (project.project_type === "diagnostic_pathway") {
      prompt = createDiagnosticPathwayPrompt(project, transcriptTexts);
      console.log("Using diagnostic pathway analysis prompt");
    } else if (project.project_type === "persona_mapping") {
      prompt = createPersonaMappingPrompt(project, transcriptTexts);
      console.log("Using persona mapping analysis prompt");
    } else if (project.project_type === "treatment_decision") {
      prompt = createTreatmentDecisionPrompt(project, transcriptTexts);
      console.log("Using treatment decision analysis prompt");
    } else if (project.project_type === "unmet_needs") {
      prompt = createUnmetNeedsPrompt(project, transcriptTexts);
      console.log("Using unmet needs analysis prompt");
    } else if (project.project_type === "behavioral_drivers") {
      prompt = createBehavioralDriversPrompt(project, transcriptTexts);
      console.log("Using behavioral drivers analysis prompt");
    } else if (project.project_type === "kol_mapping") {
      prompt = createKOLMappingPrompt(project, transcriptTexts);
      console.log("Using KOL mapping analysis prompt");
    } else if (project.project_type === "product_positioning") {
      prompt = createProductPositioningPrompt(project, transcriptTexts);
      console.log("Using product positioning analysis prompt");
    } else if (project.project_type === "product_potential") {
      prompt = createProductPotentialPrompt(project, transcriptTexts);
      console.log("Using product potential analysis prompt");
    } else if (project.project_type === "market_potential") {
      prompt = createMarketPotentialPrompt(project, transcriptTexts);
      console.log("Using market potential analysis prompt");
    } else if (project.project_type === "market_understanding") {
      prompt = createMarketUnderstandingPrompt(project, transcriptTexts);
      console.log("Using market understanding analysis prompt");
    } else if (project.project_type === "launch_readiness") {
      prompt = createLaunchReadinessPrompt(project, transcriptTexts);
      console.log("Using launch readiness analysis prompt");
    } else if (project.project_type === "message_testing") {
      prompt = createMessageTestingPrompt(project, transcriptTexts);
      console.log("Using message testing analysis prompt");
    } else if (project.project_type === "concept_testing") {
      prompt = createConceptTestingPrompt(project, transcriptTexts);
      console.log("Using concept testing analysis prompt");
    } else if (project.project_type === "material_testing") {
      prompt = createMaterialTestingPrompt(project, transcriptTexts);
      console.log("Using material testing analysis prompt");
    } else if (project.project_type === "visual_claims_testing") {
      prompt = createVisualClaimsTestingPrompt(project, transcriptTexts);
      console.log("Using visual claims testing analysis prompt");
    } else if (project.project_type === "story_flow") {
      prompt = createStoryFlowPrompt(project, transcriptTexts);
      console.log("Using story flow analysis prompt");
    } else if (project.project_type === "device_messaging") {
      prompt = createDeviceMessagingPrompt(project, transcriptTexts);
      console.log("Using device messaging analysis prompt");
    } else if (project.project_type === "co_creation") {
      prompt = createCoCreationPrompt(project, transcriptTexts);
      console.log("Using co-creation analysis prompt");
    } else if (project.project_type === "touchpoint_experience") {
      prompt = createTouchpointExperiencePrompt(project, transcriptTexts);
      console.log("Using touchpoint experience analysis prompt");
    } else if (project.project_type === "digital_usability") {
      prompt = createDigitalUsabilityPrompt(project, transcriptTexts);
      console.log("Using digital usability analysis prompt");
    } else {
      prompt = createGenericFMRPrompt(project, transcriptTexts);
      console.log(
        "Using generic FMR analysis prompt for project type:",
        project.project_type,
      );
    }

    console.log("Sending analysis request to Azure OpenAI...");

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

    console.log("Analysis completed successfully");
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
      console.log(
        "Raw AI response (last 500 chars):",
        cleanedText.substring(Math.max(0, cleanedText.length - 500)),
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
        console.error("Looking for { at position:", jsonStart);
        console.error("Looking for } at position:", jsonEnd);
        throw new Error("No valid JSON object found in response");
      }

      const jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);
      console.log("Extracted JSON length:", jsonText.length);
      console.log(
        "JSON preview (first 500 chars):",
        jsonText.substring(0, 500),
      );

      // Attempt to parse the JSON
      analysisResult = JSON.parse(jsonText);

      console.log("Parsed JSON structure:", Object.keys(analysisResult));

      // Log the actual content to debug empty responses
      if (analysisResult.fmr_dish?.questions) {
        console.log(
          "FMR Dish questions count:",
          analysisResult.fmr_dish.questions.length,
        );
        if (analysisResult.fmr_dish.questions.length > 0) {
          const firstQuestion = analysisResult.fmr_dish.questions[0];
          console.log("First question structure:", {
            question_type: firstQuestion.question_type,
            question: firstQuestion.question?.substring(0, 100),
            respondent_count: Object.keys(firstQuestion.respondents || {})
              .length,
          });

          // Check for generic responses
          const firstRespondent = Object.values(
            firstQuestion.respondents || {},
          )[0] as any;
          if (firstRespondent) {
            console.log("First respondent sample:", {
              quote: firstRespondent.quote?.substring(0, 50),
              summary: firstRespondent.summary?.substring(0, 50),
              theme: firstRespondent.theme,
            });

            // Flag generic responses
            if (
              firstRespondent.quote?.includes("No specific quote") ||
              firstRespondent.summary?.includes("No transcript content") ||
              firstRespondent.theme === "General Response"
            ) {
              console.error(
                "DETECTED GENERIC RESPONSE - AI is not extracting real content!",
              );
            }
          }
        }
      }

      if (analysisResult.content_analysis?.questions) {
        console.log(
          "Content analysis questions count:",
          analysisResult.content_analysis.questions.length,
        );
      }

      // Validate the structure
      if (!analysisResult || typeof analysisResult !== "object") {
        throw new Error("Parsed result is not a valid object");
      }

      // Handle different analysis types with proper separation
      if (
        analysis_type === "universal_content_analysis" ||
        analysis_type === "content"
      ) {
        console.log("=== PROCESSING CONTENT ANALYSIS (INDEPENDENT) ===");
        console.log("Analysis result keys:", Object.keys(analysisResult));

        // For content analysis, ONLY use content_analysis structure
        if (!analysisResult.content_analysis) {
          console.log(
            "ERROR: No content_analysis structure found in AI response",
          );
          console.log("AI returned:", JSON.stringify(analysisResult, null, 2));

          // If AI mistakenly returned fmr_dish, DO NOT convert - this breaks separation
          // Instead, create proper content_analysis structure
          analysisResult.content_analysis = {
            title: "Discussion Guide-First Content Analysis",
            description:
              "Matrix analysis following exact discussion guide structure - INDEPENDENT OF PROJECT TYPE",
            questions: [],
          };
          console.log(
            "Created empty content_analysis structure - AI failed to follow instructions",
          );
        }

        // CRITICAL: Always remove ALL non-content-analysis structures from content analysis responses
        if (analysisResult.fmr_dish) {
          console.log(
            "REMOVING fmr_dish from content analysis response - maintaining separation",
          );
          delete analysisResult.fmr_dish;
        }

        if (analysisResult.mode_analysis) {
          console.log(
            "REMOVING mode_analysis from content analysis response - maintaining separation",
          );
          delete analysisResult.mode_analysis;
        }

        if (analysisResult.strategic_themes) {
          console.log(
            "REMOVING strategic_themes from content analysis response - maintaining separation",
          );
          delete analysisResult.strategic_themes;
        }

        if (analysisResult.summary) {
          console.log(
            "REMOVING summary from content analysis response - maintaining separation",
          );
          delete analysisResult.summary;
        }

        console.log(
          "Final content_analysis questions count:",
          analysisResult.content_analysis?.questions?.length || 0,
        );

        // Log first question for debugging
        if (analysisResult.content_analysis?.questions?.length > 0) {
          const firstQ = analysisResult.content_analysis.questions[0];
          console.log("First question sample:", {
            question_type: firstQ.question_type,
            question: firstQ.question?.substring(0, 100),
            respondent_count: Object.keys(firstQ.respondents || {}).length,
          });
        }
      } else if (analysis_type === "pro_advanced") {
        console.log("=== PROCESSING PRO ADVANCED ANALYSIS (INDEPENDENT) ===");
        // For pro advanced analysis, ensure fmr_dish structure exists
        if (!analysisResult.fmr_dish) {
          analysisResult.fmr_dish = {
            title: "Pro Advanced Analysis",
            description: "Advanced analysis independent of project type",
            questions: [],
          };
        }

        // Ensure fmr_dish has questions array structure
        if (analysisResult.fmr_dish && !analysisResult.fmr_dish.questions) {
          analysisResult.fmr_dish.questions = [];
        }

        // Remove content_analysis from pro advanced responses
        if (analysisResult.content_analysis) {
          console.log("Removing content_analysis from pro advanced response");
          delete analysisResult.content_analysis;
        }
      } else {
        console.log("=== PROCESSING BASIC ANALYSIS (PROJECT TYPE BASED) ===");
        // For basic analysis, ensure fmr_dish structure exists
        if (!analysisResult.fmr_dish) {
          analysisResult.fmr_dish = {
            title: "FMR Dish Analysis - " + (project.project_type || "Basic"),
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

        // Remove content_analysis from basic analysis responses
        if (analysisResult.content_analysis) {
          console.log("Removing content_analysis from basic analysis response");
          delete analysisResult.content_analysis;
        }
      }

      // Only ensure required sections for non-content analysis
      if (
        analysis_type !== "universal_content_analysis" &&
        analysis_type !== "content"
      ) {
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

      console.log("Successfully parsed and validated analysis result");

      // Debug content analysis structure
      if (
        analysis_type === "universal_content_analysis" ||
        analysis_type === "content"
      ) {
        console.log("=== CONTENT ANALYSIS DEBUG ===");
        console.log("Response analysis type:", analysis_type);
        console.log("Has content_analysis:", !!analysisResult.content_analysis);
        console.log("Has fmr_dish:", !!analysisResult.fmr_dish);

        if (analysisResult.content_analysis?.questions?.length > 0) {
          console.log(
            "Using content_analysis questions:",
            analysisResult.content_analysis.questions.length,
          );
          setContentAnalysis({
            questions: analysisResult.content_analysis.questions,
          });
        } else if (analysisResult.fmr_dish?.questions?.length > 0) {
          console.log(
            "Fallback to fmr_dish questions:",
            analysisResult.fmr_dish.questions.length,
          );
          setContentAnalysis({ questions: analysisResult.fmr_dish.questions });
        } else {
          console.log("No questions found in response, using raw data");
          setContentAnalysis(analysisResult);
        }
      }
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
        console.log("Successfully updated analysis result in database");
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
        console.log("Successfully stored analysis result in database");
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

    // Final response with analysis type information
    const responseData = {
      success: true,
      analysis: analysisResult,
      project: project,
      documents_analyzed: documents.length,
      timestamp: new Date().toISOString(),
      stored: !!analysisRecord,
      analysis_type: analysis_type || "standard",
      is_content_analysis:
        analysis_type === "universal_content_analysis" ||
        analysis_type === "content",
    };

    console.log("=== FINAL RESPONSE DEBUG ===");
    console.log("Response analysis type:", responseData.analysis_type);
    console.log("Is content analysis:", responseData.is_content_analysis);
    console.log("Analysis structure keys:", Object.keys(analysisResult));

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in FMR analysis function:", error);
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
