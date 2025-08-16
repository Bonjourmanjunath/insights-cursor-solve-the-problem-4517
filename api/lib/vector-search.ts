import { EmbeddingService, EmbeddingChunk, EmbeddingQuery } from "./embeddings.js";

export interface SearchResult {
  chunk: EmbeddingChunk;
  similarity: number;
  rank: number;
}

export interface SearchOptions {
  topK?: number;
  similarityThreshold?: number;
  includeMetadata?: boolean;
}

export class VectorSearchService {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Search for relevant chunks using semantic similarity
   */
  async searchChunks(
    query: string,
    chunks: EmbeddingChunk[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      topK = 5,
      similarityThreshold = 0.7,
      includeMetadata = true
    } = options;

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);

      // Calculate similarities for all chunks
      const results: SearchResult[] = chunks.map((chunk, index) => ({
        chunk,
        similarity: this.embeddingService.calculateSimilarity(queryEmbedding.embedding, chunk.embedding),
        rank: index
      }));

      // Sort by similarity (highest first) and filter by threshold
      const filteredResults = results
        .filter(result => result.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map((result, index) => ({
          ...result,
          rank: index + 1
        }));

      return filteredResults;
    } catch (error: any) {
      console.error('Error in vector search:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  /**
   * Search for chunks relevant to multiple queries
   */
  async searchMultipleQueries(
    queries: string[],
    chunks: EmbeddingChunk[],
    options: SearchOptions = {}
  ): Promise<Map<string, SearchResult[]>> {
    const results = new Map<string, SearchResult[]>();

    for (const query of queries) {
      const queryResults = await this.searchChunks(query, chunks, options);
      results.set(query, queryResults);
    }

    return results;
  }

  /**
   * Find the most relevant chunks for a guide question
   */
  async findRelevantChunksForQuestion(
    question: string,
    chunks: EmbeddingChunk[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // Enhance the question with context for better matching
    const enhancedQuery = `Question: ${question}. Find relevant content that answers this question.`;
    
    return this.searchChunks(enhancedQuery, chunks, {
      topK: options.topK || 3,
      similarityThreshold: options.similarityThreshold || 0.6,
      ...options
    });
  }

  /**
   * Get unique chunks from multiple search results
   */
  getUniqueChunks(searchResults: SearchResult[]): EmbeddingChunk[] {
    const seen = new Set<string>();
    const uniqueChunks: EmbeddingChunk[] = [];

    for (const result of searchResults) {
      if (!seen.has(result.chunk.id)) {
        seen.add(result.chunk.id);
        uniqueChunks.push(result.chunk);
      }
    }

    return uniqueChunks;
  }

  /**
   * Combine multiple search results and rank by overall relevance
   */
  combineSearchResults(
    allResults: SearchResult[],
    options: { topK?: number; similarityThreshold?: number } = {}
  ): SearchResult[] {
    const { topK = 10, similarityThreshold = 0.5 } = options;

    // Group by chunk ID and calculate average similarity
    const chunkScores = new Map<string, { chunk: EmbeddingChunk; totalSimilarity: number; count: number }>();

    for (const result of allResults) {
      if (result.similarity >= similarityThreshold) {
        const existing = chunkScores.get(result.chunk.id);
        if (existing) {
          existing.totalSimilarity += result.similarity;
          existing.count += 1;
        } else {
          chunkScores.set(result.chunk.id, {
            chunk: result.chunk,
            totalSimilarity: result.similarity,
            count: 1
          });
        }
      }
    }

    // Calculate average similarity and sort
    const combinedResults: SearchResult[] = Array.from(chunkScores.values())
      .map(({ chunk, totalSimilarity, count }) => ({
        chunk,
        similarity: totalSimilarity / count,
        rank: 0 // Will be set below
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((result, index) => ({
        ...result,
        rank: index + 1
      }));

    return combinedResults;
  }
} 