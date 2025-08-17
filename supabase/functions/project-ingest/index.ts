import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // if you use cookies later, set exact origin
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  Vary: "Origin",
};

interface ChunkingConfig {
  chunkTokens: number;
  overlapTokens: number;
  embeddingModel: string;
}

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

// Simple tokenizer approximation (words * 1.3 for rough token count)
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

// Normalize and clean transcript content
function normalizeTranscript(content: string): string {
  return (
    content
      // Remove excessive whitespace
      .replace(/\s+/g, " ")
      // Fix common OCR issues
      .replace(/\b(\w)\s+(\w)\b/g, "$1$2") // Fix broken words
      // Clean timestamps but preserve speaker labels
      .replace(/\[\d{2}:\d{2}:\d{2}\]/g, "") // Remove timestamps
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim()
  );
}

// Extract speaker information from transcript
function extractSpeaker(text: string): string | undefined {
  const speakerMatch = text.match(/^([A-Z][a-zA-Z\s-]+):\s*/);
  return speakerMatch ? speakerMatch[1].trim() : undefined;
}

// Detect participant ID from content
function detectParticipantId(text: string, docName: string): string {
  // Try to extract from speaker labels
  const speaker = extractSpeaker(text);
  if (speaker && speaker !== "Interviewer" && speaker !== "Moderator") {
    return speaker;
  }

  // Try to extract from document name
  const participantMatch = docName.match(/(Patient|HCP|Respondent)[-_]?(\d+)/i);
  if (participantMatch) {
    return `${participantMatch[1]}-${participantMatch[2]}`;
  }

  // Default fallback
  return "Participant-01";
}

// Token-aware chunking with overlap
function createChunks(
  content: string,
  config: ChunkingConfig,
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

    // Check if adding this sentence would exceed chunk size
    if (
      currentTokens + sentenceTokens > config.chunkTokens &&
      currentChunk.length > 0
    ) {
      // Create chunk
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

      // Calculate overlap
      const overlapSentences = Math.ceil(
        sentences.length * (config.overlapTokens / config.chunkTokens),
      );
      const overlapStart = Math.max(0, i - overlapSentences);

      // Start new chunk with overlap
      currentChunk = sentences.slice(overlapStart, i + 1).join(". ") + ".";
      currentTokens = estimateTokens(currentChunk);
      startPosition +=
        currentChunk.length -
        estimateTokens(sentences.slice(overlapStart, i).join(". "));
    } else {
      // Add sentence to current chunk
      if (currentChunk.length > 0) currentChunk += " ";
      currentChunk += sentence;
      currentTokens += sentenceTokens;
    }
  }

  // Add final chunk if there's remaining content
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

// Extract keywords from text (simple implementation)
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.has(word))
    .slice(0, 10); // Top 10 keywords
}

// Generate embeddings using Azure OpenAI
async function generateEmbeddings(
  texts: string[],
  model: string,
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

  // Use the appropriate model deployment
  const deploymentName =
    model === "text-embedding-3-large"
      ? "text-embedding-3-large"
      : "text-embedding-3-small";
  const apiUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/embeddings?api-version=2023-05-15`;

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

// Calculate content hash for idempotency
function calculateContentHash(documents: any[]): string {
  const content = documents
    .map((doc) => `${doc.id}:${doc.content}:${doc.updated_at}`)
    .sort()
    .join("|");

  return btoa(content)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 32);
}

Deno.serve(async (req) => {
  // Preflight first
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // Never parse body before the preflight block
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const {
      project_id,
      chunkTokens = 1800,
      overlapTokens = 200,
      embeddingModel = "text-embedding-3-large",
      force = false,
    } = body;

    // Validate required fields instead of throwing
    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: "project_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Starting project ingest for project: ${project_id}`);

    // Fetch project
    const { data: project, error: projectError } = await supabaseService
      .from("research_projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found or access denied");
    }

    // Fetch documents for this project
    const { data: documents, error: documentError } = await supabaseService
      .from("research_documents")
      .select("*")
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    if (documentError) {
      throw new Error(`Failed to fetch documents: ${documentError.message}`);
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No documents found for ingestion", documents: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate content hash for idempotency
    const contentHash = calculateContentHash(documents);

    // Check if we need to re-ingest
    if (!force) {
      const { data: existingIngest } = await supabaseService
        .from("project_ingest_metadata")
        .select("*")
        .eq("project_id", project_id)
        .single();

      if (
        existingIngest &&
        existingIngest.content_hash === contentHash &&
        existingIngest.status === "completed"
      ) {
        console.log(
          "Project already ingested with same content hash, skipping",
        );
        return new Response(
          JSON.stringify({
            success: true,
            message: "Project already ingested",
            chunks: existingIngest.total_chunks,
            cached: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Create or update ingest metadata
    const { data: ingestMetadata, error: ingestError } = await supabaseService
      .from("project_ingest_metadata")
      .upsert({
        project_id: project_id,
        user_id: user.id,
        status: "processing",
        total_documents: documents.length,
        processed_documents: 0,
        total_chunks: 0,
        chunk_token_size: chunkTokens,
        overlap_tokens: overlapTokens,
        embedding_model: embeddingModel,
        content_hash: contentHash,
        processing_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (ingestError) {
      throw new Error(
        `Failed to create ingest metadata: ${ingestError.message}`,
      );
    }

    console.log("Starting document processing...");

    const config: ChunkingConfig = {
      chunkTokens,
      overlapTokens,
      embeddingModel,
    };

    let totalChunks = 0;
    let processedDocs = 0;

    // Process documents in batches to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      for (const doc of batch) {
        if (!doc.content || doc.content.trim().length === 0) {
          console.log(`Skipping document ${doc.id} - no content`);
          continue;
        }

        console.log(`Processing document: ${doc.name || doc.id}`);

        // Generate version hash for this document
        const docVersionHash = btoa(`${doc.id}:${doc.updated_at}`)
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 16);

        // Create chunks
        const chunks = createChunks(
          doc.content,
          config,
          project_id,
          doc.id,
          doc.name || "Unknown",
          docVersionHash,
        );

        if (chunks.length === 0) {
          console.log(`No chunks created for document ${doc.id}`);
          continue;
        }

        // Delete existing chunks for this document
        await supabaseService
          .from("document_chunks")
          .delete()
          .eq("project_id", project_id)
          .eq("doc_id", doc.id);

        // Insert chunks in batches
        const chunkBatchSize = 50;
        for (let j = 0; j < chunks.length; j += chunkBatchSize) {
          const chunkBatch = chunks.slice(j, j + chunkBatchSize);

          const { error: chunkError } = await supabaseService
            .from("document_chunks")
            .insert(chunkBatch);

          if (chunkError) {
            throw new Error(`Failed to insert chunks: ${chunkError.message}`);
          }
        }

        // Generate embeddings for chunks
        console.log(`Generating embeddings for ${chunks.length} chunks...`);

        const chunkTexts = chunks.map((chunk) => chunk.text);
        const embeddings = await generateEmbeddings(chunkTexts, embeddingModel);

        // Insert embeddings
        const embeddingRecords = chunks.map((chunk, index) => ({
          chunk_id: null, // Will be filled after chunk insertion
          embedding_model: embeddingModel,
          embedding: embeddings[index],
          embedding_dimension: embeddings[index].length,
        }));

        // Get chunk IDs and update embedding records
        const { data: insertedChunks, error: chunkSelectError } =
          await supabaseService
            .from("document_chunks")
            .select("id, chunk_id")
            .eq("project_id", project_id)
            .eq("doc_id", doc.id)
            .order("chunk_id");

        if (chunkSelectError || !insertedChunks) {
          throw new Error(
            `Failed to fetch inserted chunks: ${chunkSelectError?.message}`,
          );
        }

        // Update embedding records with chunk IDs
        for (
          let k = 0;
          k < embeddingRecords.length && k < insertedChunks.length;
          k++
        ) {
          embeddingRecords[k].chunk_id = insertedChunks[k].id;
        }

        // Insert embeddings in batches
        for (let k = 0; k < embeddingRecords.length; k += chunkBatchSize) {
          const embeddingBatch = embeddingRecords.slice(k, k + chunkBatchSize);

          const { error: embeddingError } = await supabaseService
            .from("document_embeddings")
            .insert(embeddingBatch);

          if (embeddingError) {
            console.error(
              `Warning: Failed to insert embeddings: ${embeddingError.message}`,
            );
          }
        }

        totalChunks += chunks.length;
        processedDocs++;

        // Update progress
        await supabaseService
          .from("project_ingest_metadata")
          .update({
            processed_documents: processedDocs,
            total_chunks: totalChunks,
          })
          .eq("id", ingestMetadata.id);

        console.log(
          `Processed document ${doc.name || doc.id}: ${chunks.length} chunks`,
        );
      }
    }

    // Mark ingestion as completed
    await supabaseService
      .from("project_ingest_metadata")
      .update({
        status: "completed",
        processing_completed_at: new Date().toISOString(),
        total_chunks: totalChunks,
        processed_documents: processedDocs,
      })
      .eq("id", ingestMetadata.id);

    console.log(
      `Project ingest completed: ${totalChunks} chunks from ${processedDocs} documents`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Project ingestion completed successfully",
        project_id: project_id,
        documents_processed: processedDocs,
        total_chunks: totalChunks,
        chunk_token_size: chunkTokens,
        overlap_tokens: overlapTokens,
        embedding_model: embeddingModel,
        content_hash: contentHash,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Error in project ingest function:", err);

    // Try to update ingest metadata with error
    try {
      // Don't try to parse the body again, use the already parsed body
      if (body?.project_id) {
        const supabaseService = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        await supabaseService
          .from("project_ingest_metadata")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("project_id", project_id);
      }
    } catch (updateError) {
      console.error("Failed to update error status:", updateError);
    }

    // Make sure errors still send CORS headers (otherwise browser treats as network fail)
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err?.message || err || "Internal server error"),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
