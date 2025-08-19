import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContentAnalysisRequest {
  projectId: string;
  analysisType: "content";
  topK?: number;
  chunkTokens?: number;
  overlapTokens?: number;
  batchSize?: number;
  maxConcurrency?: number;
}

interface GuideQuestion {
  question_type: string;
  question: string;
  respondents: Record<
    string,
    {
      quote: string;
      summary: string;
      theme: string;
      confidence?: number;
      supported_by_quote?: boolean;
    }
  >;
}

// Enhanced embedding service for Deno
class EmbeddingService {
  private azureApiKey: string;
  private azureEndpoint: string;
  private azureVersion: string;

  constructor(
    azureApiKey: string,
    azureEndpoint: string,
    azureVersion: string,
  ) {
    this.azureApiKey = azureApiKey;
    this.azureEndpoint = azureEndpoint;
    this.azureVersion = azureVersion;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`🔍 Generating embeddings for ${texts.length} texts...`);
    const apiUrl = `${this.azureEndpoint}/openai/deployments/text-embedding-3-small/embeddings?api-version=${this.azureVersion}`;

    console.log(`📡 Calling Azure OpenAI embedding API...`);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.azureApiKey,
      },
      body: JSON.stringify({
        input: texts,
      }),
    });

    if (!response.ok) {
      console.error(
        `❌ Embedding API error: ${response.status} ${response.statusText}`,
      );
      throw new Error(
        `Embedding API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    console.log(`✅ Successfully generated ${result.data.length} embeddings`);
    return result.data.map((item: any) => item.embedding);
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    const dotProduct = embedding1.reduce(
      (sum, val, i) => sum + val * embedding2[i],
      0,
    );
    const magnitude1 = Math.sqrt(
      embedding1.reduce((sum, val) => sum + val * val, 0),
    );
    const magnitude2 = Math.sqrt(
      embedding2.reduce((sum, val) => sum + val * val, 0),
    );
    return dotProduct / (magnitude1 * magnitude2);
  }
}

// Enhanced chunking with embeddings
class EnhancedChunker {
  private chunkTokens: number;
  private overlapTokens: number;
  private embeddingService: EmbeddingService;

  constructor(
    chunkTokens: number,
    overlapTokens: number,
    embeddingService: EmbeddingService,
  ) {
    this.chunkTokens = chunkTokens;
    this.overlapTokens = overlapTokens;
    this.embeddingService = embeddingService;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async createChunksWithEmbeddings(
    content: string,
    fileId: string,
    participantLabel: string,
  ): Promise<
    Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata: {
        fileId: string;
        participantLabel: string;
        startChar: number;
        endChar: number;
        tokenCount: number;
      };
    }>
  > {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const chunks: Array<{
      id: string;
      content: string;
      metadata: {
        fileId: string;
        participantLabel: string;
        startChar: number;
        endChar: number;
        tokenCount: number;
      };
    }> = [];

    let currentChunk = "";
    let startChar = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceWithPeriod = sentence.trim() + ".";
      const sentenceTokens = this.estimateTokens(sentenceWithPeriod);

      if (
        this.estimateTokens(currentChunk + sentenceWithPeriod) >
        this.chunkTokens
      ) {
        if (currentChunk.trim()) {
          chunks.push({
            id: `${fileId}_chunk_${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: {
              fileId,
              participantLabel,
              startChar,
              endChar: startChar + currentChunk.length,
              tokenCount: this.estimateTokens(currentChunk),
            },
          });
          chunkIndex++;
        }

        // Start new chunk with overlap
        const overlapText = currentChunk.slice(-this.overlapTokens * 4);
        currentChunk = overlapText + sentenceWithPeriod;
        startChar = content.indexOf(overlapText);
      } else {
        currentChunk += sentenceWithPeriod;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${fileId}_chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          fileId,
          participantLabel,
          startChar,
          endChar: startChar + currentChunk.length,
          tokenCount: this.estimateTokens(currentChunk),
        },
      });
    }

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map((chunk) => chunk.content);
    const embeddings =
      await this.embeddingService.generateEmbeddings(chunkTexts);

    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
    }));
  }
}

// Vector search service
class VectorSearchService {
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  async findRelevantChunks(
    query: string,
    chunks: Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata: any;
    }>,
    options: { topK?: number; similarityThreshold?: number } = {},
  ): Promise<
    Array<{
      chunk: any;
      similarity: number;
      rank: number;
    }>
  > {
    const { topK = 10, similarityThreshold = 0.3 } = options;

    console.log(`🔍 Vector search for query: "${query}"`);
    console.log(
      `📊 Searching through ${chunks.length} chunks with threshold ${similarityThreshold}`,
    );

    // Generate query embedding
    const [queryEmbedding] = await this.embeddingService.generateEmbeddings([
      query,
    ]);

    // Calculate similarities
    const similarities = chunks.map((chunk) => ({
      chunk,
      similarity: this.embeddingService.calculateSimilarity(
        queryEmbedding,
        chunk.embedding,
      ),
    }));

    // Filter and sort by similarity
    const results = similarities
      .filter((result) => result.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((result, index) => ({
        ...result,
        rank: index + 1,
      }));

    console.log(
      `🎯 Found ${results.length} relevant chunks for query: "${query}"`,
    );
    if (results.length > 0) {
      console.log(
        `📈 Top similarity score: ${results[0].similarity.toFixed(3)}`,
      );
      console.log(
        `👤 Top chunk participant: ${results[0].chunk.metadata.participantLabel}`,
      );
    } else {
      console.log(`⚠️ No chunks found above threshold ${similarityThreshold}`);
    }

    return results;
  }
}

// Enhanced analysis engine with embeddings and vector search
class EnhancedAnalysisEngine {
  private azureApiKey: string;
  private azureEndpoint: string;
  private azureDeployment: string;
  private azureVersion: string;
  private embeddingService: EmbeddingService;
  private chunker: EnhancedChunker;
  private vectorSearch: VectorSearchService;

  constructor(
    azureApiKey: string,
    azureEndpoint: string,
    azureDeployment: string,
    azureVersion: string,
    maxConcurrency = 3,
    batchSize = 5,
    chunkTokens = 1500,
    overlapTokens = 200,
  ) {
    this.azureApiKey = azureApiKey;
    this.azureEndpoint = azureEndpoint;
    this.azureDeployment = azureDeployment;
    this.azureVersion = azureVersion;
    this.embeddingService = new EmbeddingService(
      azureApiKey,
      azureEndpoint,
      azureVersion,
    );
    this.chunker = new EnhancedChunker(
      chunkTokens,
      overlapTokens,
      this.embeddingService,
    );
    this.vectorSearch = new VectorSearchService(this.embeddingService);
  }

  async processLargeDataset(
    documents: any[],
    project: any,
  ): Promise<{ questions: GuideQuestion[] }> {
    console.log(
      `Processing ${documents.length} documents with enhanced embedding pipeline`,
    );

    // Step 1: Extract discussion guide structure
    const guideStructure = this.extractGuideStructure(documents, project);
    console.log(
      `Extracted guide structure with ${guideStructure.length} sections`,
    );

    // Step 2: Create chunks with embeddings for all documents
    const allChunks: Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata: any;
    }> = [];

    for (const doc of documents) {
      if (!doc.content || !doc.content.trim()) continue;

      const participantLabel = this.extractParticipantId(doc);
      const chunks = await this.chunker.createChunksWithEmbeddings(
        doc.content,
        doc.id || doc.file_name,
        participantLabel,
      );
      allChunks.push(...chunks);
    }

    console.log(`Created ${allChunks.length} chunks with embeddings`);

    // Step 3: Process each guide question with vector search
    const questions: GuideQuestion[] = [];

    for (const section of guideStructure) {
      for (const question of section.questions) {
        console.log(`Processing question: "${question.questionText}"`);

        // Find relevant chunks using vector search
        const relevantChunks = await this.vectorSearch.findRelevantChunks(
          question.questionText,
          allChunks,
          { topK: 10, similarityThreshold: 0.3 },
        );

        // Group chunks by participant
        const chunksByParticipant = new Map<string, typeof relevantChunks>();
        for (const result of relevantChunks) {
          const participantLabel = result.chunk.metadata.participantLabel;
          if (!chunksByParticipant.has(participantLabel)) {
            chunksByParticipant.set(participantLabel, []);
          }
          chunksByParticipant.get(participantLabel)!.push(result);
        }

        // Process each participant's chunks
        let respondents: Record<string, any> = {};

        for (const [
          participantLabel,
          participantChunks,
        ] of chunksByParticipant) {
          if (participantChunks.length === 0) continue;

          const combinedContent = participantChunks
            .map((result) => result.chunk.content)
            .join("\n\n");

          console.log(
            `🤖 Generating GPT response for ${participantLabel} on question: "${question.questionText}"`,
          );
          console.log(
            `📝 Content length: ${combinedContent.length} characters`,
          );

          // Generate response using GPT
          const response = await this.generateQuestionResponse(
            question.questionText,
            combinedContent,
            participantLabel,
          );

          console.log(`📋 GPT Response for ${participantLabel}:`, response);

          if (
            response &&
            (response.supported_by_quote ||
              (response.quote && response.quote.length > 10))
          ) {
            console.log(`✅ Found supported quote for ${participantLabel}`);
            respondents[participantLabel] = response;
          } else {
            console.log(`❌ No supported quote found for ${participantLabel}`);
          }
        }

        // Fallback if vector search found nothing meaningful
        const respondentCount = Object.keys(respondents).length;
        if (respondentCount === 0) {
          console.log(
            `⚠️ No respondents found via vector search for question: "${question.questionText}". Falling back to direct document analysis.`,
          );
          const fallbackRespondents = await this.fallbackRespondentsForQuestion(
            documents,
            question.questionText,
          );
          respondents = fallbackRespondents;
          console.log(
            `🛟 Fallback produced ${Object.keys(respondents).length} respondents`,
          );
        }

        questions.push({
          question_type: section.sectionTitle,
          question: question.questionText,
          respondents,
        });
      }
    }

    console.log(`Analysis complete: ${questions.length} questions processed`);
    return { questions };
  }

  private async fallbackRespondentsForQuestion(
    documents: any[],
    questionText: string,
  ): Promise<Record<string, any>> {
    const respondents: Record<string, any> = {};

    for (const doc of documents) {
      if (!doc.content || !doc.content.trim()) continue;
      const participantLabel = this.extractParticipantId(doc);

      const contentSample = doc.content.substring(0, 3500);
      const response = await this.generateQuestionResponse(
        questionText,
        contentSample,
        participantLabel,
      );
      if (
        response &&
        (response.supported_by_quote ||
          (response.quote && response.quote.length > 10))
      ) {
        respondents[participantLabel] = response;
      }
    }

    return respondents;
  }

  private async generateQuestionResponse(
    question: string,
    content: string,
    participantLabel: string,
  ): Promise<any> {
    const prompt = `You are analyzing interview transcripts to extract insights for a specific question.

Question: "${question}"

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

If you find ANY relevant content, set supported_by_quote to true. Only set to false if the content is completely unrelated.

Transcript content for ${participantLabel}:
${content}`;

    try {
      const apiUrl = `${this.azureEndpoint}/openai/deployments/${this.azureDeployment}/chat/completions?api-version=${this.azureVersion}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.azureApiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are an expert qualitative research analyst. Return only valid JSON with the specified structure.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        console.error(
          `GPT API error: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const result = await response.json();
      const messageText = result.choices[0]?.message?.content as
        | string
        | undefined;

      if (!messageText) {
        console.error("No content in GPT response");
        return null;
      }

      // Try robust JSON parsing
      const parsed = this.parseJsonLoose(messageText);
      if (parsed) {
        // Normalize fields and provide minimal fallbacks
        if (!parsed.summary && content) {
          parsed.summary = content
            .split(/\n|\.\s/)
            .slice(0, 2)
            .join(". ")
            .slice(0, 300);
        }
        if (!parsed.theme && parsed.summary) {
          parsed.theme = "General Response";
        }
        if (!parsed.quote && content) {
          parsed.quote = content.trim().slice(0, 200);
        }
        if (typeof parsed.supported_by_quote !== "boolean") {
          parsed.supported_by_quote =
            !!parsed.quote && parsed.quote.length > 10;
        }
        if (typeof parsed.confidence !== "number") {
          parsed.confidence = parsed.supported_by_quote ? 0.7 : 0.5;
        }
        return parsed;
      }

      // Last-resort fallback if parsing failed
      return {
        quote: content.trim().slice(0, 200),
        summary: content
          .split(/\n|\.\s/)
          .slice(0, 2)
          .join(". ")
          .slice(0, 300),
        theme: "General Response",
        supported_by_quote: true,
        confidence: 0.5,
      };
    } catch (error) {
      console.error("Error calling GPT API:", error);
      return null;
    }
  }

  private parseJsonLoose(text: string): any | null {
    try {
      // Direct parse
      return JSON.parse(text);
    } catch (_) {
      // Strip code fences
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/i, "");
      }
      // Extract JSON object bounds
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const slice = cleaned.slice(start, end + 1);
        try {
          return JSON.parse(slice);
        } catch (e) {
          console.warn("Loose JSON parse failed after cleaning:", e);
          return null;
        }
      }
      return null;
    }
  }

  private extractGuideStructure(documents: any[], project: any): any[] {
    console.log(
      `🔍 Looking for discussion guide in ${documents.length} documents...`,
    );

    // First, check if project has guide_context
    if (project.guide_context && project.guide_context.trim()) {
      console.log(`📋 Found discussion guide in project.guide_context`);
      console.log(
        `📝 Guide content preview: ${project.guide_context.substring(0, 200)}...`,
      );

      const parser = new DiscussionGuideParser(project.guide_context);
      const structure = parser.extractGuideStructure();
      console.log(
        `🏗️ Extracted structure with ${structure.length} sections:`,
        structure.map((s) => s.sectionTitle),
      );
      return structure;
    }

    // Look for discussion guide in documents
    const guideDoc = documents.find(
      (doc) =>
        doc.file_name?.toLowerCase().includes("guide") ||
        doc.file_name?.toLowerCase().includes("discussion") ||
        doc.content?.toLowerCase().includes("discussion guide") ||
        doc.content?.toLowerCase().includes("section") ||
        doc.content?.toLowerCase().includes("warm-up") ||
        doc.content?.toLowerCase().includes("experience and practice"),
    );

    if (guideDoc) {
      console.log(
        `📋 Found discussion guide in documents: ${guideDoc.file_name}`,
      );
      console.log(
        `📝 Guide content preview: ${guideDoc.content.substring(0, 200)}...`,
      );

      const parser = new DiscussionGuideParser(guideDoc.content);
      const structure = parser.extractGuideStructure();
      console.log(
        `🏗️ Extracted structure with ${structure.length} sections:`,
        structure.map((s) => s.sectionTitle),
      );
      return structure;
    }

    console.log(`⚠️ No discussion guide found, using default structure`);
    // Create default structure based on project type
    const parser = new DiscussionGuideParser("");
    return parser.createDefaultHealthcareSections();
  }

  private extractParticipantId(doc: any): string {
    // Try to extract participant ID from filename or metadata
    const fileName = doc.file_name || "";
    const content = doc.content || "";

    // Look for patterns like "R1", "Respondent 1", "Participant 1", etc.
    const patterns = [
      /(?:respondent|participant|r)[\s_-]*(\d+)/i,
      /(?:interview|int)[\s_-]*(\d+)/i,
      /(?:^|\W)([A-Z]{1,3}\d+)(?:\W|$)/,
    ];

    for (const pattern of patterns) {
      const match = fileName.match(pattern) || content.match(pattern);
      if (match) {
        return `Respondent ${match[1]}`;
      }
    }

    // Extract from metadata if available
    if (doc.metadata?.respondent_id) {
      return doc.metadata.respondent_id;
    }

    // Fallback to filename-based ID
    return `Respondent ${doc.id || doc.file_name?.replace(/\.[^/.]+$/, "") || "Unknown"}`;
  }

  // FALLBACK: Basic analysis that will definitely work
  async fallbackBasicAnalysis(
    documents: any[],
    project: any,
  ): Promise<{ questions: GuideQuestion[] }> {
    console.log(
      `🔄 FALLBACK: Using basic analysis for ${documents.length} documents`,
    );

    const questions: GuideQuestion[] = [];

    // Use the SAME dynamic guide structure extraction
    console.log(`🔄 FALLBACK: Extracting dynamic guide structure...`);
    const sections = this.extractGuideStructure(documents, project);
    console.log(
      `🔄 FALLBACK: Using dynamic structure with ${sections.length} sections:`,
      sections.map((s) => s.sectionTitle),
    );

    for (const section of sections) {
      for (const question of section.questions) {
        console.log(
          `🔄 FALLBACK: Processing question: "${question.questionText}"`,
        );

        const respondents: Record<string, any> = {};

        // Process each document
        for (const doc of documents) {
          if (!doc.content || !doc.content.trim()) continue;

          const participantLabel = this.extractParticipantId(doc);
          console.log(`🔄 FALLBACK: Processing ${participantLabel}`);

          // Use a simple prompt that will definitely work
          const simplePrompt = `Analyze this transcript content and extract insights for the question: "${question.questionText}"

Transcript content:
${doc.content.substring(0, 2000)}

Return a JSON response with this exact structure:
{
  "quote": "a relevant quote from the transcript",
  "summary": "a brief summary",
  "theme": "the main theme",
  "supported_by_quote": true,
  "confidence": 0.8
}`;

          try {
            const apiUrl = `${this.azureEndpoint}/openai/deployments/${this.azureDeployment}/chat/completions?api-version=${this.azureVersion}`;
            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "api-key": this.azureApiKey,
              },
              body: JSON.stringify({
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a research analyst. Return only valid JSON.",
                  },
                  {
                    role: "user",
                    content: simplePrompt,
                  },
                ],
                max_tokens: 1000,
                temperature: 0.1,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              const content = result.choices[0]?.message?.content;

              if (content) {
                try {
                  const parsed = JSON.parse(content);
                  if (parsed.supported_by_quote) {
                    respondents[participantLabel] = parsed;
                    console.log(
                      `✅ FALLBACK: Found quote for ${participantLabel}`,
                    );
                  }
                } catch (parseError) {
                  console.error(
                    `❌ FALLBACK: Failed to parse response for ${participantLabel}`,
                  );
                }
              }
            }
          } catch (error) {
            console.error(
              `❌ FALLBACK: Error processing ${participantLabel}:`,
              error,
            );
          }
        }

        questions.push({
          question_type: section.sectionTitle,
          question: question.questionText,
          respondents,
        });
      }
    }

    console.log(
      `✅ FALLBACK: Basic analysis completed with ${questions.length} questions`,
    );
    return { questions };
  }
}

// Enhanced guide parser to extract detailed structure
class DiscussionGuideParser {
  private guideContent: string;

  constructor(guideContent: string) {
    this.guideContent = guideContent;
  }

  // Extract structured sections from discussion guide
  extractGuideStructure(): Array<{
    sectionId: string;
    sectionTitle: string;
    questions: Array<{
      questionId: string;
      questionText: string;
      subSections?: string[];
    }>;
  }> {
    console.log(`🔍 Extracting guide structure from content...`);
    console.log(
      `📝 Content preview: ${this.guideContent.substring(0, 300)}...`,
    );

    const sections: Array<{
      sectionId: string;
      sectionTitle: string;
      questions: Array<{
        questionId: string;
        questionText: string;
        subSections?: string[];
      }>;
    }> = [];

    // Enhanced section patterns to match real discussion guides
    const sectionPatterns = [
      // "Section A - Intro", "Section B - Drivers", etc.
      /^Section\s+([A-Z])\s*[-–]\s*([^\n]+)/gim,
      // "Section 1: Warm-up – 2 min."
      /^Section\s+(\d+)[\s\-:]*([^–\n]+)(?:–\s*(\d+)\s*min\.?)?/gim,
      // "2.1. Background and experience"
      /^(\d+)\.(\d+)\.\s*([^\n]+)/gim,
      // Generic numbered sections
      /^(\d+)\.\s*([A-Z][^.\n]+)/gim,
      // Keywords that indicate sections
      /^(Introduction|Intro|Background|Drivers?|Barriers?|Campaign|Message|Visual|Brand|Decision|Experience|Health|Partnership|Warm-up|Practice|Overview)/gim,
    ];

    let currentSection: any = null;
    let currentSubSection: any = null;

    const lines = this.guideContent.split("\n");
    console.log(`📋 Processing ${lines.length} lines...`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      console.log(`🔍 Line ${i + 1}: "${trimmedLine}"`);

      // Check for main section headers
      let sectionMatch: RegExpMatchArray | null = null;
      for (const pattern of sectionPatterns) {
        // Reset regex lastIndex to avoid issues with global flag
        pattern.lastIndex = 0;
        sectionMatch = pattern.exec(trimmedLine);
        if (sectionMatch) {
          console.log(
            `🏗️ Found section: "${trimmedLine}" with pattern: ${pattern}`,
          );
          break;
        }
      }

      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
          console.log(
            `✅ Added section: "${currentSection.sectionTitle}" with ${currentSection.questions.length} questions`,
          );
        }

        // Start new section
        const sectionNumber = sectionMatch[1] || "";
        const sectionTitle = sectionMatch[2] || sectionMatch[0];
        const timeEstimate = sectionMatch[3] || "";

        // Clean up the section title
        let cleanTitle = trimmedLine;
        if (sectionTitle && sectionTitle.trim()) {
          cleanTitle = `Section ${sectionNumber} - ${sectionTitle.trim()}`;
        }

        currentSection = {
          sectionId: `section_${sectionNumber || sections.length + 1}`,
          sectionTitle: cleanTitle,
          questions: [],
        };

        console.log(`🆕 Started new section: "${currentSection.sectionTitle}"`);
        continue;
      }

      // Check for sub-sections (like "2.1. Background and experience")
      const subSectionMatch = trimmedLine.match(/^(\d+)\.(\d+)\.\s*([^\n]+)/i);
      if (subSectionMatch) {
        console.log(`📑 Found sub-section: "${trimmedLine}"`);
        currentSubSection = {
          title: trimmedLine,
          questions: [],
        };
        continue;
      }

      // Look for questions within sections
      if (currentSection && this.isQuestion(trimmedLine)) {
        const questionId = `q_${currentSection.questions.length + 1}`;
        const subSections = this.extractSubSections(trimmedLine);

        const question = {
          questionId,
          questionText: trimmedLine,
          subSections: subSections.length > 0 ? subSections : undefined,
        };

        currentSection.questions.push(question);
        console.log(`❓ Added question: "${trimmedLine.substring(0, 50)}..."`);
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
      console.log(
        `✅ Added final section: "${currentSection.sectionTitle}" with ${currentSection.questions.length} questions`,
      );
    }

    console.log(`📊 Total sections extracted: ${sections.length}`);
    sections.forEach((section, index) => {
      console.log(
        `  ${index + 1}. "${section.sectionTitle}" (${section.questions.length} questions)`,
      );
    });

    // If no structured sections found, create default healthcare sections
    if (sections.length === 0) {
      console.log(`⚠️ No sections found, using default structure`);
      sections.push(...this.createDefaultHealthcareSections());
    }

    return sections;
  }

  private isQuestion(line: string): boolean {
    const questionIndicators = [
      /^\d+\./, // "1. What is your main specialty?"
      /^[a-z]\)/, // "a) Type of practice"
      /\?$/, // Ends with question mark
      /^(What|How|Why|When|Where|Who|Can you|Could you|Would you|Do you|Have you|Tell me|Describe|Explain)/i,
      /^(Regarding|About|Concerning|In terms of)/i,
      // Healthcare-specific question patterns
      /^(What is your|How many|Can you estimate|Type of practice|Department|Establishment|Hours per week|Spend visiting|Administering|Performing surgeries)/i,
      // Look for lines that seem like questions but don't end with ?
      /^(What|How|Can you|Tell me|Describe|Explain|Estimate|Spend|Visit|Administer|Perform)/i,
      // Healthcare research specific patterns
      /^(Opinion on|First\/Must-have|Middle of the list|Sources do you|Campaigns Awareness|Competitive landscape|Message evaluation|Brand|Personal decision|Visual evaluation)/i,
      // Content that indicates discussion topics
      /^(Likes|Dislikes|Yes\/Nay exercise|Importance|Drivers|Barriers)/i,
    ];

    const trimmedLine = line.trim();
    const isQuestion = questionIndicators.some((pattern) =>
      pattern.test(trimmedLine),
    );

    // Additional check: if line contains question words and is not too long
    if (!isQuestion && trimmedLine.length < 150) {
      const questionWords = [
        "what",
        "how",
        "why",
        "when",
        "where",
        "who",
        "can",
        "could",
        "would",
        "do",
        "have",
        "tell",
        "describe",
        "explain",
        "estimate",
        "opinion",
        "criteria",
        "drivers",
        "barriers",
        "awareness",
        "evaluation",
        "preference",
      ];
      const hasQuestionWord = questionWords.some((word) =>
        trimmedLine.toLowerCase().includes(word),
      );
      if (hasQuestionWord) {
        console.log(`❓ Detected question by keyword: "${trimmedLine}"`);
        return true;
      }
    }

    // Also consider lines that are clearly discussion topics even without question words
    const topicIndicators = [
      /^(CLEAR ALIGNERS|BRACKETS|Trusted\.|Quality you need|Your partner|Empowering you)/i,
      /^\d+\. [A-Z]/, // "1. CLEAR ALIGNERS", "2. BRACKETS"
      /^[A-Z][A-Z\s]+$/, // All caps topics like "CLEAR ALIGNERS"
    ];

    if (topicIndicators.some((pattern) => pattern.test(trimmedLine))) {
      console.log(`📋 Detected topic/question: "${trimmedLine}"`);
      return true;
    }

    return isQuestion;
  }

  private extractSubSections(questionText: string): string[] {
    const subSections: string[] = [];

    // Look for healthcare-specific sub-sections
    const healthcareSubSections = [
      "Clear Aligners",
      "Brackets",
      "Treatment Decision",
      "Patient Experience",
      "Brand Preference",
      "Campaign Awareness",
      "Message Evaluation",
      "Drivers",
      "Barriers",
      "Must-have criteria",
      "Nice-to-have criteria",
      "Accuracy/Control",
      "Trusted Partnership",
      "Patient Health/Experience",
      "Visuals",
      "Messages",
      "Competitive landscape",
    ];

    const lowerQuestion = questionText.toLowerCase();

    for (const subSection of healthcareSubSections) {
      if (lowerQuestion.includes(subSection.toLowerCase())) {
        subSections.push(subSection);
      }
    }

    return subSections;
  }

  createDefaultHealthcareSections(): Array<{
    sectionId: string;
    sectionTitle: string;
    questions: Array<{
      questionId: string;
      questionText: string;
      subSections?: string[];
    }>;
  }> {
    return [
      {
        sectionId: "section_a",
        sectionTitle: "Section A - Intro",
        questions: [
          {
            questionId: "intro_1",
            questionText: "Introduction and background",
            subSections: [
              "Professional Background",
              "Experience",
              "Practice Details",
            ],
          },
        ],
      },
      {
        sectionId: "section_b",
        sectionTitle: "Section B - Drivers and Barriers",
        questions: [
          {
            questionId: "drivers_1",
            questionText:
              "Opinion on drivers of choice for clear aligners. Reasons for it.",
            subSections: ["Clear Aligners", "Brackets"],
          },
          {
            questionId: "criteria_1",
            questionText:
              "First/Must-have criteria of choice for clear aligners",
            subSections: ["Must-have criteria", "Nice-to-have criteria"],
          },
        ],
      },
      {
        sectionId: "section_c",
        sectionTitle: "Section C - Campaign tracks",
        questions: [
          {
            questionId: "campaign_1",
            questionText: "Campaigns Awareness",
            subSections: ["Message Evaluation", "Competitive landscape"],
          },
          {
            questionId: "messages_1",
            questionText: "Message evaluation and brand preference",
            subSections: [
              "Trusted. Accurate. Patient-centered.",
              "Quality you need comfort they demand.",
              "Your partner in creating custom smiles.",
              "Empowering you to control treatment.",
            ],
          },
        ],
      },
      {
        sectionId: "section_d",
        sectionTitle: "Section D - Messages",
        questions: [
          {
            questionId: "visuals_1",
            questionText: "Visual evaluation and patient imagery",
            subSections: ["Patient Image", "Clear Aligners", "Brackets"],
          },
        ],
      },
    ];
  }

  // Extract respondent profile fields from guide
  extractProfileFields(): string[] {
    const profileFields: string[] = [];
    const commonFields = [
      "Country",
      "Segment",
      "Specialty",
      "Experience",
      "Usage Clear Aligners and Brackets",
      "3M user or non-user",
      "Practice Type",
      "Patient Volume",
      "Years in Practice",
    ];

    const lowerGuide = this.guideContent.toLowerCase();

    for (const field of commonFields) {
      if (
        lowerGuide.includes(field.toLowerCase()) ||
        lowerGuide.includes(field.replace(/\s+/g, "").toLowerCase())
      ) {
        profileFields.push(field);
      }
    }

    // Add default fields if none found
    if (profileFields.length === 0) {
      profileFields.push(
        "Country",
        "Segment",
        "Usage Clear Aligners and Brackets",
        "3M user or non-user",
      );
    }

    return profileFields;
  }
}

serve(async (req) => {
  console.log("🚨 FUNCTION CALLED - ENHANCED ANALYSIS FUNCTION IS RUNNING!");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

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

    const {
      projectId,
      analysisType,
      topK = 8,
      chunkTokens = 1800,
      overlapTokens = 200,
      batchSize = 5,
      maxConcurrency = 3,
    } = await req.json();

    if (!projectId || analysisType !== "content") {
      throw new Error("Invalid request parameters");
    }

    // Fetch project data
    const { data: project, error: projectError } = await supabaseService
      .from("research_projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found or access denied");
    }

    // Check if we have documents to analyze
    const { data: documents, error: documentError } = await supabaseService
      .from("research_documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (documentError) {
      throw new Error(`Failed to fetch documents: ${documentError.message}`);
    }

    if (!documents || documents.length === 0) {
      throw new Error(
        "No documents found for analysis. Please upload transcripts or documents first.",
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

    console.log(
      `🚀 STARTING CONTENT ANALYSIS for ${documents.length} documents`,
    );

    // STEP 1: FIND DISCUSSION GUIDE
    console.log("🔍 STEP 1: Looking for discussion guide...");

    let discussionGuide = null;
    let guideSource = "none";

    // Check project.guide_context first
    if (project.guide_context && project.guide_context.trim()) {
      discussionGuide = project.guide_context;
      guideSource = "project_settings";
      console.log("✅ Found discussion guide in project settings");
      console.log("📏 Length:", discussionGuide.length);
      console.log("📝 Preview:", discussionGuide.substring(0, 200));
    }

    if (!discussionGuide) {
      // Look for discussion guide in uploaded documents
      const guideDoc = documents.find((doc) => {
        const fileName = doc.file_name?.toLowerCase() || "";
        const content = doc.content?.toLowerCase() || "";

        return (
          fileName.includes("guide") ||
          fileName.includes("discussion") ||
          content.includes("discussion guide") ||
          content.includes("section") ||
          content.includes("warm-up") ||
          content.includes("experience and practice")
        );
      });

      if (guideDoc) {
        discussionGuide = guideDoc.content;
        guideSource = "uploaded_document";
        console.log(
          "✅ Found discussion guide in uploaded documents:",
          guideDoc.file_name,
        );
        console.log("📏 Length:", discussionGuide.length);
        console.log("📝 Preview:", discussionGuide.substring(0, 200));
      } else {
        console.log("❌ No discussion guide found");
        console.log("📄 Available documents:");
        documents.forEach((doc, index) => {
          console.log(
            `  ${index + 1}. ${doc.file_name} (${doc.content?.length || 0} chars)`,
          );
        });

        // Use a comprehensive test guide that matches real healthcare research
        console.log("🧪 Using comprehensive test discussion guide...");
        discussionGuide = `Section A - Intro
1. What is your main specialty?
2. How many years of experience do you have?
3. What type of practice do you work in?
4. Sources do you rely on to research solutions?

Section B - Drivers and barriers
1. CLEAR ALIGNERS
Opinion on drivers of choice for clear aligners. Reasons for it.
First/Must-have criteria of choice for clear aligners
Middle of the list/nice-to-have criteria of choice for clear aligners

2. BRACKETS
What are the main drivers and barriers when choosing a manufacturer of brackets?
First/Must-have criteria of choice for brackets
Middle of the list/nice-to-have criteria of choice for brackets

Section C - Campaign tracks
Importance
Campaigns Awareness
Competitive landscape/message evaluation
1. Trusted. Accurate. Patient-centered.
2. Quality you need comfort they demand.
3. Your partner in creating custom smiles.
4. Empowering you to control treatment.

Section D - Messages
Likes
Dislikes
Yes/Nay exercise. Which message do you like best Message 1 or Message 2.
Brand
Personal decision

Section E - Visuals
1. Visual evaluation and patient imagery
2. Clear aligners vs brackets imagery`;
        guideSource = "comprehensive_test_guide";
        console.log("✅ Using comprehensive test discussion guide");
        console.log("📏 Length:", discussionGuide.length);
        console.log("📝 Preview:", discussionGuide.substring(0, 200));
      }
    }

    // STEP 2: EXTRACT GUIDE STRUCTURE
    console.log("🏗️ STEP 2: Extracting guide structure...");

    let guideStructure;
    if (discussionGuide) {
      const parser = new DiscussionGuideParser(discussionGuide);
      guideStructure = parser.extractGuideStructure();
      console.log(
        "✅ Extracted guide structure:",
        guideStructure.map((s) => s.sectionTitle),
      );
    } else {
      console.log(
        "⚠️ No discussion guide found - this will use generic sections",
      );
      const parser = new DiscussionGuideParser("");
      guideStructure = parser.createDefaultHealthcareSections();
      console.log(
        "📋 Using default structure:",
        guideStructure.map((s) => s.sectionTitle),
      );
    }

    // STEP 3: PROCESS EACH GUIDE QUESTION
    console.log("🔄 STEP 3: Processing guide questions...");
    const questions = [];

    for (const section of guideStructure) {
      console.log(`📋 Processing section: "${section.sectionTitle}"`);

      for (const question of section.questions) {
        console.log(`❓ Processing question: "${question.questionText}"`);

        const respondents = {};

        // Process each document for this question
        for (const doc of documents) {
          if (!doc.content || !doc.content.trim()) continue;

          const participantLabel = `Respondent ${doc.id || doc.file_name?.replace(/\.[^/.]+$/, "") || "Unknown"}`;
          console.log(
            `👤 Processing ${participantLabel} for question: "${question.questionText}"`,
          );

          // Generate response using GPT
          const response = await generateQuestionResponse(
            question.questionText,
            doc.content,
            participantLabel,
            azureEndpoint,
            azureDeployment,
            azureVersion,
            azureApiKey,
          );

          if (response && response.supported_by_quote) {
            respondents[participantLabel] = response;
            console.log(`✅ Found response for ${participantLabel}`);
          } else {
            console.log(`❌ No relevant response for ${participantLabel}`);
          }
        }

        questions.push({
          question_type: section.sectionTitle,
          question: question.questionText,
          respondents,
        });
      }
    }

    console.log(
      `✅ Analysis complete: ${questions.length} questions processed`,
    );

    // Store results in analysis_results table
    const { error: resultError } = await supabaseService
      .from("analysis_results")
      .upsert({
        research_project_id: projectId,
        analysis_type: "content",
        analysis_data: { questions },
        updated_at: new Date().toISOString(),
      });

    if (resultError) {
      console.warn("Failed to store in analysis_results:", resultError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: { questions },
        metadata: {
          guideSource,
          questionsProcessed: questions.length,
          documentsAnalyzed: documents.length,
          guideStructure: guideStructure.map((s) => s.sectionTitle),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Content analysis error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Content analysis failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// Helper function to generate question response
async function generateQuestionResponse(
  question: string,
  content: string,
  participantLabel: string,
  azureEndpoint: string,
  azureDeployment: string,
  azureVersion: string,
  azureApiKey: string,
) {
  const prompt = `You are analyzing interview transcripts to extract insights for a specific question.

Question: "${question}"

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

If you find ANY relevant content, set supported_by_quote to true. Only set to false if the content is completely unrelated.

Transcript content for ${participantLabel}:
${content.substring(0, 3000)}`;

  try {
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
            content:
              "You are an expert qualitative research analyst. Return only valid JSON with the specified structure.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error(`GPT API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      console.error("No content in GPT response");
      return null;
    }

    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT response as JSON:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error calling GPT API:", error);
    return null;
  }
}
