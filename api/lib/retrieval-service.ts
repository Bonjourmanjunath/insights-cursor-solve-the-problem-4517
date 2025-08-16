import { azureOpenAIService } from "./azure-openai-service";
import { PromisePool } from "./promise-pool";

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

export class RetrievalService {
  async findRelevantWindows(
    question: string,
    chunks: TranscriptChunk[],
    embedPool: PromisePool,
  ): Promise<Array<{ window: TextWindow; score: number }>> {
    // Extract keywords from question for BM25/regex pre-filtering
    const keywords = this.extractKeywords(question);

    // Pre-filter chunks using keywords
    const filteredChunks = this.preFilterChunks(chunks, keywords);

    if (filteredChunks.length === 0) {
      return [];
    }

    // Get embeddings for question and filtered chunks
    const questionEmbedding = await azureOpenAIService.getEmbedding(question);

    // Get embeddings for all windows in filtered chunks
    const windows = filteredChunks.flatMap((chunk) => chunk.windows);
    const windowContents = windows.map((window) => window.content);

    // Batch window embeddings (max 8 at a time)
    const windowEmbeddings = [];
    for (let i = 0; i < windowContents.length; i += 8) {
      const batch = windowContents.slice(i, i + 8);
      const batchEmbeddings = await embedPool.add(() =>
        azureOpenAIService.getBatchEmbeddings(batch),
      );
      windowEmbeddings.push(...batchEmbeddings);
    }

    // Calculate similarity scores
    const scoredWindows = windows.map((window, i) => {
      const similarity = this.cosineSimilarity(
        questionEmbedding,
        windowEmbeddings[i] || [],
      );
      return { window, score: similarity };
    });

    // Sort by score and take top-K
    scoredWindows.sort((a, b) => b.score - a.score);
    return scoredWindows.slice(0, 8); // Take top 8 windows
  }

  private extractKeywords(text: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
      "a",
      "an",
      "the",
      "and",
      "or",
      "but",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "to",
      "from",
      "in",
      "out",
      "on",
      "off",
      "over",
      "under",
      "again",
      "further",
      "then",
      "once",
      "here",
      "there",
      "when",
      "where",
      "why",
      "how",
      "all",
      "any",
      "both",
      "each",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "nor",
      "not",
      "only",
      "own",
      "same",
      "so",
      "than",
      "too",
      "very",
      "can",
      "will",
      "just",
      "should",
      "now",
    ]);

    // Extract words, convert to lowercase, and filter out stop words
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private preFilterChunks(
    chunks: TranscriptChunk[],
    keywords: string[],
  ): TranscriptChunk[] {
    if (keywords.length === 0) {
      return chunks; // No keywords to filter by
    }

    // Create regex patterns for each keyword
    const patterns = keywords.map(
      (keyword) => new RegExp(`\\b${keyword}\\b`, "i"),
    );

    // Filter chunks that contain at least one keyword
    return chunks.filter((chunk) => {
      const content = chunk.content.toLowerCase();
      return patterns.some((pattern) => pattern.test(content));
    });
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length || vec1.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }
}

export const retrievalService = new RetrievalService();
