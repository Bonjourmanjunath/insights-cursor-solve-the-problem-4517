import { supabase } from "@/integrations/supabase/client";

const universalFMRDishPrompt = `
You are a world-class qualitative research analyst specializing in healthcare research for top-tier consulting firms (McKinsey, BCG, Bain) and Fortune 500 healthcare companies. You must deliver GPT-4.1 level insights that meet the standards of premium qualitative research.

🎯 **CRITICAL MISSION**: Extract ACTUAL content from the provided transcripts. You must find real interviewer questions and real respondent answers. DO NOT create generic responses.

📋 **MANDATORY PROCESS**:

**STEP 1: TRANSCRIPT CONTENT EXTRACTION**
- Read through EVERY line of the transcript carefully
- Identify ACTUAL interviewer questions (look for patterns like "Interviewer:", "Moderator:", "Q:", question marks, etc.)
- Identify ACTUAL respondent answers (look for patterns like "Respondent:", "Patient:", "Doctor:", "R1:", "P1:", etc.)
- Extract the EXACT text - do not paraphrase or summarize yet

**STEP 2: RESPONDENT IDENTIFICATION**
- Look for speaker labels in the transcript (Respondent 1, Patient A, Dr. Smith, etc.)
- If no clear labels, create logical IDs based on content (Respondent-01, Respondent-02, etc.)
- Note any demographic or professional information mentioned

**STEP 3: QUESTION CATEGORIZATION**
- Group questions by topic/section (Introduction, Background, Main Discussion, Barriers, Decision Factors, etc.)
- Use the actual question structure from the transcript
- Preserve the original question wording

**STEP 4: INSIGHT EXTRACTION**
For each question-response pair:
- **Quote**: Extract the most insightful 15-40 words VERBATIM from the respondent's answer
- **Summary**: Write 2-3 sentences explaining what this response reveals about the respondent's perspective, motivations, or experience
- **Theme**: Identify a specific, actionable theme (e.g., "Cost concerns override efficacy", "Trust in peer recommendations", "Workflow integration challenges")

**CRITICAL REQUIREMENTS**:
❌ NEVER use "No specific quote available" or "General Response"
❌ NEVER create generic or placeholder content
❌ NEVER assume or invent content not in the transcript
✅ ALWAYS extract actual verbatim quotes from the transcript
✅ ALWAYS base summaries on actual respondent statements
✅ ALWAYS create specific, meaningful themes

📊 **REQUIRED OUTPUT FORMAT**:
{
  "fmr_dish": {
    "questions": [
      {
        "question_category": "[Actual section from transcript]",
        "interviewer_question": "[Exact question text from transcript]",
        "respondents": {
          "[Respondent-ID]": {
            "quote": "[Exact verbatim from transcript - 15-40 words]",
            "summary": "[2-3 sentences explaining the insight and implications]",
            "theme": "[Specific, actionable theme based on the response]"
          }
        }
      }
    ]
  }
}

🚨 **QUALITY CONTROL**: Before submitting your analysis:
1. Verify every quote is actual verbatim from the transcript
2. Ensure every summary provides genuine insight
3. Confirm every theme is specific and actionable
4. Check that you have multiple respondents with different perspectives
5. Validate that question categories reflect the actual discussion structure

If the transcript is unclear or incomplete, extract what you can but DO NOT create fictional content.`;

export class ContentAnalysisService {
  static async analyzeTranscriptContent(content: string): Promise<any> {
    try {
      // Call Supabase Edge Function for Azure OpenAI analysis
      const { data, error } = await supabase.functions.invoke(
        "azure-openai-chat",
        {
          body: {
            messages: [
              {
                role: "system",
                content:
                  "You are a world-class qualitative research analyst specializing in healthcare research for top-tier consulting firms and Fortune 500 healthcare companies. You must deliver GPT-4.1 level insights that meet the standards of McKinsey, BCG, Bain, Gartner, and Iqvia. Every analysis must be strategically relevant, behaviorally grounded, and actionably specific.",
              },
              {
                role: "user",
                content: `${universalFMRDishPrompt}\n\n📥 **TRANSCRIPT FOR ANALYSIS**:\n\n${content}\n\n🎯 **DELIVER WORLD-CLASS INSIGHTS**: Extract maximum strategic value from every question and response. Focus on decision drivers, emotional context, system barriers, and actionable themes that C-suite executives can use for strategic planning.`,
              },
            ],
            temperature: 0.2,
            max_tokens: 8000,
          },
        },
      );

      if (error) {
        console.error("Azure OpenAI error:", error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      // Parse the response
      const responseText = data.choices?.[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from AI");
      }

      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid JSON response from AI");
      }

      const analysisResult = JSON.parse(jsonMatch[0]);
      return analysisResult;
    } catch (error) {
      console.error("Content analysis error:", error);
      throw error;
    }
  }

  static async analyzeProjectTranscripts(projectId: string): Promise<any> {
    try {
      // Get all research files for the project
      const { data: files, error } = await supabase
        .from("research_files")
        .select("id, file_name, content")
        .eq("project_id", projectId)
        .not("content", "is", null);

      if (error) {
        throw new Error(`Failed to fetch transcripts: ${error.message}`);
      }

      if (!files || files.length === 0) {
        throw new Error("No transcript files found for this project");
      }

      // Combine all transcript content
      const combinedContent = files
        .map(
          (file) =>
            `\n=== TRANSCRIPT: ${file.file_name} ===\n${file.content}\n`,
        )
        .join("\n\n");

      console.log(`Analyzing ${files.length} transcript files...`);

      // Analyze the combined content
      const result = await this.analyzeTranscriptContent(combinedContent);

      return {
        ...result,
        metadata: {
          filesAnalyzed: files.length,
          fileNames: files.map((f) => f.file_name),
          analysisDate: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Project analysis error:", error);
      throw error;
    }
  }
}

export default ContentAnalysisService;
