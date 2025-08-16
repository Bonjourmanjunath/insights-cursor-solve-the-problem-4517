import { AzureOpenAIService } from "./azure-openai-service.js";

export interface EmbeddingChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    fileId: string;
    chunkId: string;
    startChar: number;
    endChar: number;
    tokenCount: number;
  };
}

export interface EmbeddingQuery {
  text: string;
  embedding: number[];
}

export class EmbeddingService {
  private azureOpenAI: AzureOpenAIService;

  constructor() {
    this.azureOpenAI = new AzureOpenAIService();
  }

  /**
   * Generate embeddings for multiple text chunks
   */
  async generateEmbeddings(chunks: Array<{ id: string; content: string; metadata: any }>): Promise<EmbeddingChunk[]> {
    try {
      const texts = chunks.map(chunk => chunk.content);
      const embeddings = await this.azureOpenAI.getBatchEmbeddings(texts);

      return chunks.map((chunk, index) => ({
        id: chunk.id,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: chunk.metadata,
      }));
    } catch (error: any) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a single query text
   */
  async generateQueryEmbedding(query: string): Promise<EmbeddingQuery> {
    try {
      const embedding = await this.azureOpenAI.getEmbedding(query);
      return {
        text: query,
        embedding: embedding,
      };
    } catch (error: any) {
      console.error('Error generating query embedding:', error);
      throw new Error(`Failed to generate query embedding: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }
} 