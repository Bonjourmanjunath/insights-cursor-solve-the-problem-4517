import { VectorSearchService } from "./vector-search.js";
import { azureOpenAIService } from "./azure-openai-service.js";
import { tokenCount } from "./tokenizer.js";
import { PromisePool } from "./promise-pool.js";

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
  embedding?: number[];
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

export async function generateEnhancedFMRDishMatrix(
  transcripts: ProcessedTranscript[],
  guide: GuideItem[],
  options: { maxChunksPerQuestion?: number; enableCostOptimization?: boolean } = {}
): Promise<AnalysisResult> {
  const { maxChunksPerQuestion = 10, enableCostOptimization = true } = options;
  // Initialize metrics
  let totalTokens = 0;
  let supportedQuotes = 0;
  let answeredQuestions = 0;
  let retryCount = 0;
  let rateLimitHits = 0;

  // Initialize vector search service
  const vectorSearchService = new VectorSearchService();

  // Create promise pool for concurrent processing
  const chatPool = new PromisePool(6); // MAX_CONCURRENT_CHAT

  // Initialize result structure
  const fmrDishQuestions: FMRDishQuestion[] = [];

  // Convert all chunks to embedding format for vector search
  const allChunks = transcripts.flatMap(transcript =>
    transcript.chunks
      .filter(chunk => chunk.embedding) // Only chunks with embeddings
      .map(chunk => ({
        id: chunk.chunkId,
        content: chunk.content,
        embedding: chunk.embedding!,
        metadata: {
          fileId: transcript.fileId,
          chunkId: chunk.chunkId,
          startChar: chunk.startChar,
          endChar: chunk.endChar,
          tokenCount: chunk.tokenCount,
          participantLabel: transcript.label
        }
      }))
  );

  // Process each guide question
  for (const guideItem of guide) {
    const questionResponses: Record<string, QuestionResponse[]> = {};

    // Use vector search to find relevant chunks for this question
    let relevantChunks = await vectorSearchService.findRelevantChunksForQuestion(
      guideItem.question,
      allChunks,
      {
        topK: maxChunksPerQuestion,
        similarityThreshold: 0.3 // Lowered threshold to catch more content
      }
    );

    // Cost optimization: Limit chunks for large transcript sets
    if (enableCostOptimization && transcripts.length > 10) {
      const maxChunksPerParticipant = Math.max(1, Math.floor(maxChunksPerQuestion / transcripts.length));
      const chunksByParticipant = new Map<string, typeof relevantChunks>();
      
      for (const result of relevantChunks) {
        const participantLabel = result.chunk.metadata.participantLabel;
        if (!chunksByParticipant.has(participantLabel)) {
          chunksByParticipant.set(participantLabel, []);
        }
        const participantChunks = chunksByParticipant.get(participantLabel)!;
        if (participantChunks.length < maxChunksPerParticipant) {
          participantChunks.push(result);
        }
      }
      
      relevantChunks = Array.from(chunksByParticipant.values()).flat();
      console.log(`Cost optimization: Limited to ${maxChunksPerParticipant} chunks per participant for ${transcripts.length} transcripts`);
    }

    // Fallback: If no chunks found, use keyword search
    if (relevantChunks.length === 0) {
      console.log(`No vector search results for question: "${guideItem.question}"`);
      
      // Extract keywords from question for fallback search
      const keywords = guideItem.question.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(' ')
        .filter(word => word.length > 3);
      
      // Find chunks containing keywords
      relevantChunks = allChunks
        .map(chunk => ({
          chunk,
          similarity: keywords.some(keyword => 
            chunk.content.toLowerCase().includes(keyword)
          ) ? 0.5 : 0, // Assign similarity score for keyword matches
          rank: 1
        }))
        .filter(result => result.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      
      console.log(`Fallback keyword search found ${relevantChunks.length} chunks`);
    }

    // Group relevant chunks by participant
    const chunksByParticipant = new Map<string, typeof relevantChunks>();
    for (const result of relevantChunks) {
      const participantLabel = result.chunk.metadata.participantLabel;
      if (!chunksByParticipant.has(participantLabel)) {
        chunksByParticipant.set(participantLabel, []);
      }
      chunksByParticipant.get(participantLabel)!.push(result);
    }

    // Process each participant's relevant chunks
    for (const [participantLabel, participantChunks] of chunksByParticipant) {
      if (participantChunks.length === 0) continue;

      // Combine relevant chunks for this participant
      const combinedContent = participantChunks
        .map(result => result.chunk.content)
        .join('\n\n');

      // Generate response using GPT
      const response = await chatPool.add(async () => {
        console.log(`Processing ${participantLabel} for question: "${guideItem.question}"`);
        console.log(`Content length: ${combinedContent.length} characters`);
        
        const systemPrompt = `You are analyzing interview transcripts to extract insights for a specific question.

Question: "${guideItem.question}"

Extract from the provided transcript content:
1. A relevant quote (verbatim text from the transcript)
2. A concise summary (2 sentences max)
3. The main theme/topic

IMPORTANT: Look for ANY content that could relate to the question, even if it's not a perfect match. Be generous in finding relevant content.

Format your response as JSON:
{
  "quote": "exact quote from transcript",
  "summary": "2 sentence summary",
  "theme": "main theme/topic",
  "supported_by_quote": true/false,
  "confidence": 0.0-1.0
}

If you find ANY relevant content, set supported_by_quote to true. Only set to false if the content is completely unrelated.`;

        const result = await azureOpenAIService.extractStructuredData(
          systemPrompt,
          combinedContent,
          { temperature: 0.2 } // Slightly higher for better content discovery
        );

        totalTokens += result.usage?.total_tokens || 0;
        retryCount += result.retries || 0;
        rateLimitHits += result.rateLimitHits || 0;

        console.log(`Response for ${participantLabel}:`, result.data);
        return result.data as QuestionResponse;
      });

      if (response && response.supported_by_quote) {
        if (!questionResponses[participantLabel]) {
          questionResponses[participantLabel] = [];
        }
        questionResponses[participantLabel].push(response);
        supportedQuotes++;
      }
    }

    // Create FMR Dish question entry
    const fmrDishQuestion: FMRDishQuestion = {
      question_type: guideItem.theme,
      question: guideItem.question,
      respondents: {}
    };

    // Add responses for each participant
    for (const [participantLabel, responses] of Object.entries(questionResponses)) {
      if (responses.length > 0) {
        // Use the best response (highest confidence)
        const bestResponse = responses.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        );

        // Find the source chunk
        const sourceChunk = relevantChunks.find(result =>
          result.chunk.metadata.participantLabel === participantLabel
        );

        fmrDishQuestion.respondents[participantLabel] = {
          quote: bestResponse.quote,
          summary: bestResponse.summary,
          theme: bestResponse.theme,
          source: {
            participantLabel,
            chunkId: sourceChunk?.chunk.chunkId || 'unknown',
            windowId: 'w1', // Simplified for now
            timeStart: sourceChunk?.chunk.metadata.startChar,
            timeEnd: sourceChunk?.chunk.metadata.endChar
          }
        };

        answeredQuestions++;
      }
    }

    fmrDishQuestions.push(fmrDishQuestion);
  }

  return {
    questions: fmrDishQuestions,
    metadata: {
      totalTokens,
      supportedQuotes,
      answeredQuestions,
      totalQuestions: guide.length,
      totalRespondents: transcripts.length,
      retryCount,
      rateLimitHits
    }
  };
} 