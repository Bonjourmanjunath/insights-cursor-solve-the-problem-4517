import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { validateRequest } from "../lib/validation.js";
import { parseGuide } from "../lib/guide-parser.js";
import { EnhancedChunkingService } from "../lib/enhanced-chunking.js";
import { VectorSearchService } from "../lib/vector-search.js";
import { generateEnhancedFMRDishMatrix } from "../lib/enhanced-dish-matrix-generator.js";
import { buildExcelWorkbook } from "../lib/excel-builder.js";
import { logMetrics } from "../lib/logger.js";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Validate request
    const validationResult = validateRequest(req.body);
    if (!validationResult.valid) {
      context.res = {
        status: 400,
        body: { error: validationResult.error },
      };
      return;
    }

    // Extract and parse input data
    const { files, guide: rawGuide, guideDescription } = req.body;

    // Parse guide (handles both array and string formats)
    const parsedGuide = await parseGuide(rawGuide);
    if (parsedGuide.length < 3) {
      context.res = {
        status: 400,
        body: { error: "Guide not parsed or insufficient questions detected" },
      };
      return;
    }

    // Initialize enhanced chunking and vector search services
    const chunkingService = new EnhancedChunkingService();
    const vectorSearchService = new VectorSearchService();

    // Process transcripts with enhanced chunking and embeddings
    const processedTranscripts = await Promise.all(
      files.map(async (file: { name: string; label: string; content: string }) => {
        const chunks = await chunkingService.createTranscriptChunks(
          file.content,
          file.name,
          {
            targetChunkSize: 1500,
            overlapSize: 200,
            generateEmbeddings: true,
            preserveSentenceBoundaries: true
          }
        );

        return {
          fileId: file.name,
          label: file.label,
          chunks: chunks.map(chunk => ({
            chunkId: chunk.id,
            content: chunk.content,
            startChar: chunk.metadata.startChar,
            endChar: chunk.metadata.endChar,
            tokenCount: chunk.metadata.tokenCount,
            embedding: chunk.embedding,
            windows: [] // Simplified for now
          }))
        };
      })
    );

    // Generate Enhanced FMR Dish Matrix with vector search and cost optimization
    const analysisResult = await generateEnhancedFMRDishMatrix(
      processedTranscripts,
      parsedGuide,
      {
        maxChunksPerQuestion: files.length > 20 ? 5 : 10, // Reduce chunks for large datasets
        enableCostOptimization: files.length > 10 // Enable optimization for 10+ transcripts
      }
    );

    // Calculate metrics
    const latency = Date.now() - startTime;
    const supportedByQuoteRate =
      analysisResult.metadata.supportedQuotes /
      (analysisResult.metadata.totalQuestions *
        analysisResult.metadata.totalRespondents);
    const coverageRate =
      analysisResult.metadata.answeredQuestions /
      (analysisResult.metadata.totalQuestions *
        analysisResult.metadata.totalRespondents);

    // Add metadata
    const responseData = {
      fmr_dish: {
        title: "FMR Dish Analysis",
        description:
          guideDescription || "Matrix by guide questions and respondents",
        questions: analysisResult.questions,
      },
      analysis_metadata: {
        filesProcessed: files.length,
        guideItemsProcessed: parsedGuide.length,
        supportedByQuoteRate,
        coverageRate,
        latency_ms: latency,
        totalTokens: analysisResult.metadata.totalTokens,
      },
    };

    // Log metrics (no PII)
    logMetrics({
      filesCount: files.length,
      questionsCount: parsedGuide.length,
      tokensUsed: analysisResult.metadata.totalTokens,
      latencyMs: latency,
      supportedByQuoteRate,
      coverageRate,
      retryCount: analysisResult.metadata.retryCount || 0,
      rateLimitHits: analysisResult.metadata.rateLimitHits || 0,
    });

    // Generate Excel workbook
    const workbookBuffer = await buildExcelWorkbook(responseData);
    const safeFileName = `FMR_Dish_Analysis_${new Date().toISOString().split("T")[0]}`;

    // Return JSON response
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: responseData,
    };
  } catch (error: any) {
    context.log.error(`Error processing request: ${error.message}`);
    context.log.error(error.stack);

    context.res = {
      status: 500,
      body: {
        error: "Internal server error during analysis",
        message: error.message,
      },
    };
  }
};

export default httpTrigger;
