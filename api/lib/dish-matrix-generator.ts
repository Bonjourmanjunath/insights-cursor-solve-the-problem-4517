import { retrievalService } from "./retrieval-service";
import { azureOpenAIService } from "./azure-openai-service";
import { tokenCount } from "./tokenizer";
import { PromisePool } from "./promise-pool";

interface GuideItem {
  theme: string;
  question: string;
}

interface ProcessedTranscript {
  fileId: string;
  label: string;
  chunks: TranscriptChunk[];
}

interface TranscriptChunk {
  chunkId: string;
  content: string;
  startChar: number;
  endChar: number;
  tokenCount: number;
  windows: TextWindow[];
}

interface TextWindow {
  windowId: string;
  content: string;
  startChar: number;
  endChar: number;
  tokenCount: number;
}

interface QuestionResponse {
  quote: string;
  summary: string;
  theme: string;
  supported_by_quote: boolean;
  confidence: number;
  speaker?: string;
  timeStart?: number;
  timeEnd?: number;
}

interface FMRDishQuestion {
  question_type: string;
  question: string;
  respondents: Record<
    string,
    {
      quote: string;
      summary: string;
      theme: string;
      source: {
        participantLabel: string;
        chunkId: string;
        windowId: string;
        timeStart?: number;
        timeEnd?: number;
      };
    }
  >;
}

interface AnalysisResult {
  questions: FMRDishQuestion[];
  metadata: {
    totalTokens: number;
    supportedQuotes: number;
    answeredQuestions: number;
    totalQuestions: number;
    totalRespondents: number;
    retryCount: number;
    rateLimitHits: number;
  };
}

export async function generateFMRDishMatrix(
  transcripts: ProcessedTranscript[],
  guide: GuideItem[],
): Promise<AnalysisResult> {
  // Initialize metrics
  let totalTokens = 0;
  let supportedQuotes = 0;
  let answeredQuestions = 0;
  let retryCount = 0;
  let rateLimitHits = 0;

  // Create promise pool for concurrent processing
  const chatPool = new PromisePool(6); // MAX_CONCURRENT_CHAT
  const embedPool = new PromisePool(4); // MAX_CONCURRENT_EMBED

  // Initialize result structure
  const fmrDishQuestions: FMRDishQuestion[] = [];

  // Process each guide question
  for (const guideItem of guide) {
    const questionResponses: Record<string, QuestionResponse[]> = {};

    // For each transcript, find relevant chunks
    for (const transcript of transcripts) {
      // Get relevant windows for this question and transcript
      const relevantWindows = await retrievalService.findRelevantWindows(
        guideItem.question,
        transcript.chunks,
        embedPool,
      );

      if (relevantWindows.length === 0) {
        continue; // No relevant content found
      }

      // Extract answers from each window
      const windowResponses = await Promise.all(
        relevantWindows.map((window) =>
          chatPool.add(() =>
            extractAnswer(guideItem, window, transcript.label),
          ),
        ),
      );

      // Update metrics
      const windowTokensUsed = windowResponses.reduce(
        (sum, resp) => sum + (resp.tokensUsed || 0),
        0,
      );
      totalTokens += windowTokensUsed;
      retryCount += windowResponses.reduce(
        (sum, resp) => sum + (resp.retries || 0),
        0,
      );
      rateLimitHits += windowResponses.reduce(
        (sum, resp) => sum + (resp.rateLimitHits || 0),
        0,
      );

      // Collect responses for this transcript
      questionResponses[transcript.label] = windowResponses.map(
        (resp) => resp.response,
      );
    }

    // Select best response for each respondent
    const bestResponses: Record<
      string,
      {
        response: QuestionResponse;
        windowInfo: {
          chunkId: string;
          windowId: string;
        };
      }
    > = {};

    for (const [respondent, responses] of Object.entries(questionResponses)) {
      if (responses.length === 0) continue;

      // Score and rank responses
      const scoredResponses = responses.map((response, index) => {
        const relevantWindow = transcripts
          .find((t) => t.label === respondent)
          ?.chunks.flatMap((c) => c.windows)
          .find((w) => w.windowId.includes(`w${index}`));

        const specificity = calculateSpecificity(
          response.quote,
          response.summary,
        );
        const score =
          0.45 * (relevantWindow?.score || 0) +
          0.35 * response.confidence +
          0.2 * specificity;

        return {
          response,
          score,
          windowInfo: {
            chunkId: relevantWindow?.windowId.split("_w")[0] || "",
            windowId: relevantWindow?.windowId || "",
          },
        };
      });

      // Sort by score and pick the best
      scoredResponses.sort((a, b) => b.score - a.score);
      if (scoredResponses.length > 0) {
        bestResponses[respondent] = scoredResponses[0];

        // Update metrics
        if (scoredResponses[0].response.supported_by_quote) {
          supportedQuotes++;
        }
        answeredQuestions++;
      }
    }

    // Create FMR Dish question entry
    const fmrQuestion: FMRDishQuestion = {
      question_type: guideItem.theme,
      question: guideItem.question,
      respondents: {},
    };

    // Add best response for each respondent
    for (const [respondent, bestResponse] of Object.entries(bestResponses)) {
      fmrQuestion.respondents[respondent] = {
        quote: bestResponse.response.quote,
        summary: bestResponse.response.summary,
        theme: bestResponse.response.theme,
        source: {
          participantLabel: respondent,
          chunkId: bestResponse.windowInfo.chunkId,
          windowId: bestResponse.windowInfo.windowId,
          timeStart: bestResponse.response.timeStart,
          timeEnd: bestResponse.response.timeEnd,
        },
      };
    }

    fmrDishQuestions.push(fmrQuestion);
  }

  return {
    questions: fmrDishQuestions,
    metadata: {
      totalTokens,
      supportedQuotes,
      answeredQuestions,
      totalQuestions: guide.length * transcripts.length,
      totalRespondents: transcripts.length,
      retryCount,
      rateLimitHits,
    },
  };
}

async function extractAnswer(
  guideItem: GuideItem,
  window: {
    window: TextWindow;
    score: number;
  },
  respondentLabel: string,
): Promise<{
  response: QuestionResponse;
  tokensUsed: number;
  retries: number;
  rateLimitHits: number;
}> {
  // Get controlled vocabulary for this theme
  const allowedThemes = getControlledVocabulary(guideItem.theme);

  // Create system prompt
  const systemPrompt = `
    You are extracting answers from interview transcripts. Focus only on the respondent's speech.
    Ignore any moderator/interviewer text. The question is: "${guideItem.question}"
    
    Return a JSON object with these fields:
    - quote: A single verbatim sentence from the respondent that directly supports the answer (must be exact text)
    - summary: A 1-3 sentence specific summary of the respondent's answer
    - theme: One of these allowed themes: ${allowedThemes.join(", ")}, or "Other"
    - supported_by_quote: Boolean indicating if the quote directly supports the summary
    - confidence: Number from 0-1 indicating your confidence in this extraction
    
    If you find timestamps in the format [MM:SS] or similar, include:
    - timeStart: Start time in seconds
    - timeEnd: End time in seconds
    
    If the text doesn't answer the question, return low confidence and supported_by_quote=false.
  `;

  // Call Azure OpenAI
  const result = await azureOpenAIService.extractStructuredData(
    systemPrompt,
    window.window.content,
    {
      temperature: 0.1,
      responseFormat: { type: "json_object" },
    },
  );

  // Validate and process response
  let response: QuestionResponse;
  try {
    response = result.data;

    // Ensure response has required fields
    if (!response.quote || !response.summary || !response.theme) {
      throw new Error("Missing required fields in response");
    }

    // Ensure theme is from controlled vocabulary
    if (!allowedThemes.includes(response.theme) && response.theme !== "Other") {
      response.theme = "Other";
    }

    // Cap confidence if not supported by quote
    if (!response.supported_by_quote && response.confidence > 0.5) {
      response.confidence = 0.5;
    }
  } catch (error) {
    // Fallback response if parsing fails
    response = {
      quote: "[No direct quote found]",
      summary: "The respondent did not directly address this question.",
      theme: "Other",
      supported_by_quote: false,
      confidence: 0.1,
    };
  }

  return {
    response,
    tokensUsed: result.usage?.total_tokens || 0,
    retries: result.retries || 0,
    rateLimitHits: result.rateLimitHits || 0,
  };
}

function getControlledVocabulary(theme: string): string[] {
  // Map theme to controlled vocabulary
  const themeMap: Record<string, string[]> = {
    "Warm-up": ["Experience/Setting", "Role/Unit", "Patient Mix", "Other"],
    "Current Practices": [
      "Workflow",
      "Assessment",
      "Products",
      "Outcomes",
      "Complications",
      "Other",
    ],
    "Supply/Budget": [
      "Stocking",
      "Formulary",
      "Procurement",
      "Off-Formulary",
      "Budget",
      "Other",
    ],
    Trials: [
      "Criteria",
      "Duration",
      "Metrics",
      "Training",
      "Adoption",
      "Other",
    ],
    Challenges: [
      "Access",
      "Staffing/Training",
      "Evidence",
      "Workflow",
      "Budget",
      "Other",
    ],
  };

  // Return vocabulary for theme, or default set
  return (
    themeMap[theme] || [
      "Experience",
      "Process",
      "Outcome",
      "Challenge",
      "Other",
    ]
  );
}

function calculateSpecificity(quote: string, summary: string): number {
  const combinedText = `${quote} ${summary}`;

  // Check for specific indicators
  const hasNumbers = /\d+/.test(combinedText);
  const hasNamedRoles =
    /doctor|nurse|specialist|technician|pharmacist|administrator/i.test(
      combinedText,
    );
  const hasTimeReferences =
    /\bdays\b|\bweeks\b|\bmonths\b|\byears\b|\bhours\b|\bminutes\b/i.test(
      combinedText,
    );
  const hasProductNames =
    /brand|product|device|medication|drug|therapy|treatment/i.test(
      combinedText,
    );

  // Calculate specificity score (0-1)
  let score = 0;
  if (hasNumbers) score += 0.3;
  if (hasNamedRoles) score += 0.2;
  if (hasTimeReferences) score += 0.25;
  if (hasProductNames) score += 0.25;

  return Math.min(score, 1.0);
}
