import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  Vary: "Origin",
};

interface DocumentChunk {
  project_id: string;
  doc_id: string;
  participant_id?: string;
  chunk_id: number;
  text: string;
  start_position: number;
  end_position: number;
  num_tokens: number;
  version_hash: string;
  speaker?: string;
  timecodes?: any;
  keywords?: string[];
  language: string;
}

// Token estimation and chunking functions
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

function normalizeTranscript(content: string): string {
  return content
    .replace(/\s+/g, " ")
    .replace(/\b(\w)\s+(\w)\b/g, "$1$2")
    .replace(/\[\d{2}:\d{2}:\d{2}\]/g, "")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

function extractSpeaker(text: string): string | undefined {
  const speakerMatch = text.match(/^([A-Z][a-zA-Z\s-]+):\s*/);
  return speakerMatch ? speakerMatch[1].trim() : undefined;
}

function detectParticipantId(text: string, docName: string): string {
  const speaker = extractSpeaker(text);
  if (speaker && speaker !== "Interviewer" && speaker !== "Moderator") {
    return speaker;
  }
  const participantMatch = docName.match(/(Patient|HCP|Respondent)[-_]?(\d+)/i);
  if (participantMatch) {
    return `${participantMatch[1]}-${participantMatch[2]}`;
  }
  return "Participant-01";
}

function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "are", "was", "were", "be", "been", "have",
    "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "can", "this", "that", "these", "those", "i", "you",
    "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.has(word))
    .slice(0, 10);
}

function createChunks(
  content: string,
  chunkTokens: number,
  overlapTokens: number,
  projectId: string,
  docId: string,
  docName: string,
  versionHash: string,
): DocumentChunk[] {
  const normalizedContent = normalizeTranscript(content);
  const sentences = normalizedContent
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);
  const chunks: DocumentChunk[] = [];

  let currentChunk = "";
  let currentTokens = 0;
  let chunkId = 0;
  let startPosition = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + ".";
    const sentenceTokens = estimateTokens(sentence);

    if (
      currentTokens + sentenceTokens > chunkTokens &&
      currentChunk.length > 0
    ) {
      const participant = detectParticipantId(currentChunk, docName);
      const speaker = extractSpeaker(currentChunk);

      chunks.push({
        project_id: projectId,
        doc_id: docId,
        participant_id: participant,
        chunk_id: chunkId++,
        text: currentChunk.trim(),
        start_position: startPosition,
        end_position: startPosition + currentChunk.length,
        num_tokens: currentTokens,
        version_hash: versionHash,
        speaker: speaker,
        language: "en",
        keywords: extractKeywords(currentChunk),
      });

      const overlapSentences = Math.ceil(
        sentences.length * (overlapTokens / chunkTokens),
      );
      const overlapStart = Math.max(0, i - overlapSentences);

      currentChunk = sentences.slice(overlapStart, i + 1).join(". ") + ".";
      currentTokens = estimateTokens(currentChunk);
      startPosition +=
        currentChunk.length -
        estimateTokens(sentences.slice(overlapStart, i).join(". "));
    } else {
      if (currentChunk.length > 0) currentChunk += " ";
      currentChunk += sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk.trim().length > 0) {
    const participant = detectParticipantId(currentChunk, docName);
    const speaker = extractSpeaker(currentChunk);

    chunks.push({
      project_id: projectId,
      doc_id: docId,
      participant_id: participant,
      chunk_id: chunkId,
      text: currentChunk.trim(),
      start_position: startPosition,
      end_position: startPosition + currentChunk.length,
      num_tokens: currentTokens,
      version_hash: versionHash,
      speaker: speaker,
      language: "en",
      keywords: extractKeywords(currentChunk),
    });
  }

  return chunks;
}

// Rate limiter for embeddings
class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async waitForTokens(count: number): Promise<void> {
    this.refill();
    while (this.tokens < count) {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.refill();
    }
    this.tokens -= count;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }
}

// Generate embeddings with rate limiting
async function generateEmbeddings(
  texts: string[],
  model: string,
  rateLimiter: RateLimiter,
): Promise<number[][]> {
  const azureApiKey =
    Deno.env.get("text-embedding-3-small-key") ||
    Deno.env.get("FMR_AZURE_OPENAI_API_KEY");
  const azureEndpoint =
    Deno.env.get("text-embedding-3-small-endpoint") ||
    Deno.env.get("FMR_AZURE_OPENAI_ENDPOINT");

  if (!azureApiKey || !azureEndpoint) {
    throw new Error("Azure OpenAI embedding credentials not configured");
  }

  const deploymentName = model === "text-embedding-3-large"
    ? "text-embedding-3-large"
    : "text-embedding-3-small";
  
  const apiUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/embeddings?api-version=2023-05-15`;

  // Wait for rate limit tokens (estimate based on text size)
  const estimatedTokens = texts.reduce((sum, text) => sum + estimateTokens(text), 0);
  await rateLimiter.waitForTokens(estimatedTokens);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": azureApiKey,
    },
    body: JSON.stringify({
      input: texts,
      model: deploymentName,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const workerId = `worker-${crypto.randomUUID()}`;
  console.log(`Worker ${workerId} started`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiter: 60k tokens per minute
    const rateLimiter = new RateLimiter(60000, 1000);

    // Claim a job
    const { data: job, error: claimError } = await supabaseService
      .rpc("claim_ingest_job", { p_worker_id: workerId });

    if (claimError || !job) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No jobs available",
          worker_id: workerId 
        }),
        { headers: corsHeaders }
      );
    }

    console.log(`Worker ${workerId} claimed job ${job.id} for document ${job.document_id}`);

    try {
      // Get document
      const { data: document, error: docError } = await supabaseService
        .from("research_documents")
        .select("*")
        .eq("id", job.document_id)
        .single();

      if (docError || !document) {
        throw new Error(`Document not found: ${job.document_id}`);
      }

      // Update job progress
      await supabaseService.rpc("update_job_progress", {
        p_job_id: job.id,
        p_progress: { status: "chunking", chunks_created: 0 }
      });

      // Generate version hash
      const docVersionHash = btoa(`${document.id}:${document.updated_at}`)
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 16);

      // Create chunks
      const chunks = createChunks(
        document.content || "",
        1200, // chunk tokens
        200,  // overlap tokens
        job.project_id,
        document.id,
        document.name || "Unknown",
        docVersionHash,
      );

      console.log(`Created ${chunks.length} chunks for document ${document.id}`);

      // Delete existing chunks
      await supabaseService
        .from("document_chunks")
        .delete()
        .eq("project_id", job.project_id)
        .eq("doc_id", document.id);

      // Insert chunks in batches
      const chunkBatchSize = 50;
      for (let i = 0; i < chunks.length; i += chunkBatchSize) {
        const batch = chunks.slice(i, i + chunkBatchSize);
        await supabaseService
          .from("document_chunks")
          .insert(batch);
        
        // Update progress
        await supabaseService.rpc("update_job_progress", {
          p_job_id: job.id,
          p_progress: { 
            status: "chunking", 
            chunks_created: Math.min(i + chunkBatchSize, chunks.length),
            total_chunks: chunks.length
          }
        });
      }

      // Generate embeddings in batches
      console.log(`Generating embeddings for ${chunks.length} chunks...`);
      
      const embeddingBatchSize = 10;
      const allEmbeddings: number[][] = [];
      
      for (let i = 0; i < chunks.length; i += embeddingBatchSize) {
        const batch = chunks.slice(i, i + embeddingBatchSize);
        const texts = batch.map(chunk => chunk.text);
        
        const embeddings = await generateEmbeddings(texts, "text-embedding-3-small", rateLimiter);
        allEmbeddings.push(...embeddings);
        
        // Update progress
        await supabaseService.rpc("update_job_progress", {
          p_job_id: job.id,
          p_progress: { 
            status: "embedding", 
            embeddings_created: allEmbeddings.length,
            total_chunks: chunks.length
          }
        });
      }

      // Get chunk IDs and store embeddings
      const { data: insertedChunks } = await supabaseService
        .from("document_chunks")
        .select("id, chunk_id")
        .eq("project_id", job.project_id)
        .eq("doc_id", document.id)
        .order("chunk_id");

      if (insertedChunks) {
        const embeddingRecords = insertedChunks.map((chunk, index) => ({
          chunk_id: chunk.id,
          embedding_model: "text-embedding-3-small",
          embedding: allEmbeddings[index],
          embedding_dimension: allEmbeddings[index]?.length || 0,
        }));

        // Insert embeddings in batches
        for (let i = 0; i < embeddingRecords.length; i += chunkBatchSize) {
          const batch = embeddingRecords.slice(i, i + chunkBatchSize);
          await supabaseService
            .from("document_embeddings")
            .insert(batch);
        }
      }

      // Mark job as completed
      await supabaseService
        .from("ingest_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            ...job.metadata,
            chunks_created: chunks.length,
            embeddings_created: allEmbeddings.length,
          }
        })
        .eq("id", job.id);

      // Update project metadata
      const { data: jobStats } = await supabaseService
        .from("ingest_jobs")
        .select("status")
        .eq("project_id", job.project_id);

      const completed = jobStats?.filter(j => j.status === "completed").length || 0;
      const failed = jobStats?.filter(j => j.status === "failed").length || 0;
      const total = jobStats?.length || 0;

      await supabaseService
        .from("project_ingest_metadata")
        .update({
          jobs_completed: completed,
          jobs_failed: failed,
          status: completed === total ? "completed" : "processing",
          processing_completed_at: completed === total ? new Date().toISOString() : null,
        })
        .eq("project_id", job.project_id);

      console.log(`Worker ${workerId} completed job ${job.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Job completed successfully",
          job_id: job.id,
          chunks_created: chunks.length,
          embeddings_created: allEmbeddings.length,
        }),
        { headers: corsHeaders }
      );

    } catch (jobError: any) {
      console.error(`Worker ${workerId} job ${job.id} failed:`, jobError);

      // Mark job as failed
      await supabaseService
        .from("ingest_jobs")
        .update({
          status: "failed",
          error_message: jobError.message,
          retry_count: job.retry_count + 1,
        })
        .eq("id", job.id);

      // Update project metadata
      const { data: jobStats } = await supabaseService
        .from("ingest_jobs")
        .select("status")
        .eq("project_id", job.project_id);

      const failed = jobStats?.filter(j => j.status === "failed").length || 0;

      await supabaseService
        .from("project_ingest_metadata")
        .update({
          jobs_failed: failed,
        })
        .eq("project_id", job.project_id);

      throw jobError;
    }

  } catch (err: any) {
    console.error(`Worker ${workerId} error:`, err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err?.message || err || "Internal server error"),
        worker_id: workerId,
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}); 