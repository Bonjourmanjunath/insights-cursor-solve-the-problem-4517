import { tokenCount } from "./tokenizer.js";
import { EmbeddingService, EmbeddingChunk } from "./embeddings.js";

export interface EnhancedChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    fileId: string;
    chunkId: string;
    startChar: number;
    endChar: number;
    tokenCount: number;
    type: 'transcript' | 'guide' | 'question';
    tags?: string[];
  };
}

export interface ChunkingOptions {
  targetChunkSize?: number;
  overlapSize?: number;
  generateEmbeddings?: boolean;
  preserveSentenceBoundaries?: boolean;
}

export class EnhancedChunkingService {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Create chunks from transcript content with optional embeddings
   */
  async createTranscriptChunks(
    content: string,
    fileId: string,
    options: ChunkingOptions = {}
  ): Promise<EnhancedChunk[]> {
    const {
      targetChunkSize = 1500,
      overlapSize = 200,
      generateEmbeddings = true,
      preserveSentenceBoundaries = true
    } = options;

    // Create basic chunks
    const chunks = this.createBasicChunks(content, fileId, targetChunkSize, overlapSize, preserveSentenceBoundaries);

    // Generate embeddings if requested
    if (generateEmbeddings) {
      const chunksWithEmbeddings = await this.addEmbeddingsToChunks(chunks, 'transcript');
      return chunksWithEmbeddings;
    }

    return chunks;
  }

  /**
   * Create chunks from discussion guide content
   */
  async createGuideChunks(
    guideContent: string,
    options: ChunkingOptions = {}
  ): Promise<EnhancedChunk[]> {
    const {
      targetChunkSize = 800,
      overlapSize = 100,
      generateEmbeddings = true
    } = options;

    // Parse guide into sections and questions
    const guideSections = this.parseGuideContent(guideContent);
    
    const chunks: EnhancedChunk[] = [];
    let chunkIndex = 0;

    for (const section of guideSections) {
      const sectionChunks = this.createBasicChunks(
        section.content,
        `guide_${section.id}`,
        targetChunkSize,
        overlapSize,
        true
      );

      // Add section metadata
      for (const chunk of sectionChunks) {
        chunk.metadata.type = 'guide';
        chunk.metadata.tags = [section.type, section.title];
        chunk.id = `guide_${section.id}_c${chunkIndex.toString().padStart(2, '0')}`;
        chunks.push(chunk);
        chunkIndex++;
      }
    }

    // Generate embeddings if requested
    if (generateEmbeddings) {
      return await this.addEmbeddingsToChunks(chunks, 'guide');
    }

    return chunks;
  }

  /**
   * Create chunks optimized for question-answer matching
   */
  async createQuestionChunks(
    questions: string[],
    options: ChunkingOptions = {}
  ): Promise<EnhancedChunk[]> {
    const { generateEmbeddings = true } = options;

    const chunks: EnhancedChunk[] = questions.map((question, index) => ({
      id: `question_${index.toString().padStart(2, '0')}`,
      content: question,
      metadata: {
        fileId: 'questions',
        chunkId: `q${index.toString().padStart(2, '0')}`,
        startChar: 0,
        endChar: question.length,
        tokenCount: tokenCount(question),
        type: 'question',
        tags: ['question', 'guide']
      }
    }));

    // Generate embeddings if requested
    if (generateEmbeddings) {
      return await this.addEmbeddingsToChunks(chunks, 'question');
    }

    return chunks;
  }

  /**
   * Create basic chunks with overlap
   */
  private createBasicChunks(
    content: string,
    fileId: string,
    targetChunkSize: number,
    overlapSize: number,
    preserveSentenceBoundaries: boolean
  ): EnhancedChunk[] {
    const chunks: EnhancedChunk[] = [];
    let startChar = 0;
    let chunkIndex = 0;

    while (startChar < content.length) {
      // Find a good chunk end point
      let endChar = preserveSentenceBoundaries 
        ? this.findSentenceBoundary(content, startChar + targetChunkSize)
        : Math.min(startChar + targetChunkSize, content.length);

      if (endChar <= startChar) {
        endChar = Math.min(startChar + targetChunkSize, content.length);
      }

      const chunkContent = content.substring(startChar, endChar).trim();
      
      if (chunkContent.length > 0) {
        const chunkId = `${fileId.replace(/\s+/g, "_")}_c${chunkIndex.toString().padStart(2, "0")}`;

        chunks.push({
          id: chunkId,
          content: chunkContent,
          metadata: {
            fileId,
            chunkId,
            startChar,
            endChar,
            tokenCount: tokenCount(chunkContent),
            type: 'transcript',
            tags: []
          }
        });
      }

      // Move to next chunk with overlap
      const overlapStartChar = Math.max(startChar, endChar - overlapSize);
      startChar = overlapStartChar;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Add embeddings to chunks
   */
  private async addEmbeddingsToChunks(
    chunks: EnhancedChunk[],
    type: 'transcript' | 'guide' | 'question'
  ): Promise<EnhancedChunk[]> {
    try {
      const embeddingChunks = await this.embeddingService.generateEmbeddings(chunks);
      
      return embeddingChunks.map(embeddingChunk => ({
        ...embeddingChunk,
        embedding: embeddingChunk.embedding,
        metadata: {
          ...embeddingChunk.metadata,
          type
        }
      }));
    } catch (error: any) {
      console.warn(`Failed to generate embeddings for ${type} chunks:`, error.message);
      // Return chunks without embeddings if embedding generation fails
      return chunks;
    }
  }

  /**
   * Parse guide content into sections
   */
  private parseGuideContent(content: string): Array<{ id: string; title: string; content: string; type: string }> {
    const sections: Array<{ id: string; title: string; content: string; type: string }> = [];
    const lines = content.split('\n');
    
    let currentSection = { id: '', title: '', content: '', type: 'section' };
    let sectionIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect section headers
      if (trimmedLine.match(/^(Section|Part|Chapter)\s+\d+/i) || 
          trimmedLine.match(/^[A-Z][A-Z\s]+:$/)) {
        
        // Save previous section if exists
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection, id: `section_${sectionIndex}` });
          sectionIndex++;
        }
        
        // Start new section
        currentSection = {
          id: `section_${sectionIndex}`,
          title: trimmedLine,
          content: trimmedLine + '\n',
          type: 'section'
        };
      } else if (trimmedLine.match(/^\d+\.\s+/) || trimmedLine.match(/^[A-Z]\.\s+/)) {
        // Detect questions
        sections.push({
          id: `question_${sectionIndex}`,
          title: trimmedLine,
          content: trimmedLine,
          type: 'question'
        });
        sectionIndex++;
      } else {
        // Add to current section
        currentSection.content += line + '\n';
      }
    }

    // Add final section
    if (currentSection.content.trim()) {
      sections.push({ ...currentSection, id: `section_${sectionIndex}` });
    }

    return sections;
  }

  /**
   * Find sentence boundary near target position
   */
  private findSentenceBoundary(text: string, targetPosition: number): number {
    const sentenceEndings = ['.', '!', '?', '\n\n'];
    
    // Look for sentence endings near the target position
    for (const ending of sentenceEndings) {
      const pos = text.indexOf(ending, targetPosition - 100);
      if (pos > targetPosition - 100 && pos < targetPosition + 100) {
        return pos + ending.length;
      }
    }

    // If no good boundary found, return target position
    return targetPosition;
  }

  /**
   * Get chunks by type
   */
  filterChunksByType(chunks: EnhancedChunk[], type: 'transcript' | 'guide' | 'question'): EnhancedChunk[] {
    return chunks.filter(chunk => chunk.metadata.type === type);
  }

  /**
   * Get chunks by tag
   */
  filterChunksByTag(chunks: EnhancedChunk[], tag: string): EnhancedChunk[] {
    return chunks.filter(chunk => chunk.metadata.tags?.includes(tag));
  }
} 