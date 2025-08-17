import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdvancedAnalysisConfig {
  research_goal: string;
  discussion_guide: string;
  research_hypothesis: string;
  research_dictionary: string;
  guided_themes: string[];
  sentiment_analysis_enabled: boolean;
  outlier_detection_enabled: boolean;
  comparative_analysis_enabled: boolean;
  hypothesis_validation_enabled: boolean;
  analysis_mode: "basic" | "advanced";
}

interface AdvancedAnalysisRequest {
  project_id: string;
  config: AdvancedAnalysisConfig;
  batchSize?: number;
  maxConcurrency?: number;
}

// Large-scale processing utilities for Pro Advanced Analysis
class ProAdvancedProcessor {
  private maxConcurrency: number;
  private batchSize: number;
  private azureApiKey: string;
  private azureEndpoint: string;
  private azureDeployment: string;
  private azureVersion: string;

  constructor(
    azureApiKey: string,
    azureEndpoint: string,
    azureDeployment: string,
    azureVersion: string,
    maxConcurrency = 4,
    batchSize = 8,
  ) {
    this.azureApiKey = azureApiKey;
    this.azureEndpoint = azureEndpoint;
    this.azureDeployment = azureDeployment;
    this.azureVersion = azureVersion;
    this.maxConcurrency = maxConcurrency;
    this.batchSize = batchSize;
  }

  async processLargeTranscriptSet(
    documents: any[],
    project: any,
    config: AdvancedAnalysisConfig,
  ) {
    console.log(
      `🚀 Starting Pro Advanced Analysis for ${documents.length} documents`,
    );

    // Step 1: Intelligent document batching
    const documentBatches = this.createIntelligentBatches(documents);
    console.log(`📦 Created ${documentBatches.length} intelligent batches`);

    // Step 2: Process batches with controlled concurrency
    const batchResults = [];
    for (let i = 0; i < documentBatches.length; i += this.maxConcurrency) {
      const concurrentBatches = documentBatches.slice(
        i,
        i + this.maxConcurrency,
      );

      console.log(
        `🔄 Processing batch group ${Math.floor(i / this.maxConcurrency) + 1}/${Math.ceil(documentBatches.length / this.maxConcurrency)}`,
      );

      const promises = concurrentBatches.map((batch, batchIndex) =>
        this.processSingleBatch(batch, project, config, i + batchIndex),
      );

      try {
        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            batchResults.push(result.value);
          } else {
            console.error(`Batch ${i + index} failed:`, result.reason);
          }
        });
      } catch (error) {
        console.error(`Error in batch group ${i}:`, error);
      }

      // Rate limiting: small delay between batch groups
      if (i + this.maxConcurrency < documentBatches.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Step 3: Intelligent result consolidation
    const consolidatedResults = this.consolidateAdvancedResults(
      batchResults,
      config,
    );

    console.log(
      `✅ Pro Advanced Analysis complete: ${batchResults.length} batches processed`,
    );
    return consolidatedResults;
  }

  private createIntelligentBatches(documents: any[]): any[][] {
    // Sort documents by size for better load balancing
    const sortedDocs = documents
      .filter((d) => d.content && d.content.trim())
      .sort((a, b) => (b.content?.length || 0) - (a.content?.length || 0));

    const batches: any[][] = [];
    let currentBatch: any[] = [];
    let currentBatchSize = 0;
    const maxBatchTokens = 15000; // Approximate token limit per batch

    for (const doc of sortedDocs) {
      const docTokens = Math.ceil((doc.content?.length || 0) / 4); // Rough token estimate

      if (
        currentBatchSize + docTokens > maxBatchTokens &&
        currentBatch.length > 0
      ) {
        batches.push([...currentBatch]);
        currentBatch = [doc];
        currentBatchSize = docTokens;
      } else {
        currentBatch.push(doc);
        currentBatchSize += docTokens;
      }

      // Ensure batches don't get too large
      if (currentBatch.length >= this.batchSize) {
        batches.push([...currentBatch]);
        currentBatch = [];
        currentBatchSize = 0;
      }
    }

    // Add final batch if it has content
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private async processSingleBatch(
    documents: any[],
    project: any,
    config: AdvancedAnalysisConfig,
    batchIndex: number,
  ) {
    const transcriptContent = documents
      .map((d, i) => `[Document_${batchIndex}_${i}]: ${d.content}`)
      .join("\n\n---DOCUMENT SEPARATOR---\n\n");

    const prompt = `You are a senior healthcare qualitative research strategist at FMR Global Health specializing in Pro Advanced Analysis.

BATCH ${batchIndex + 1} - Pro Advanced Analysis

PROJECT CONTEXT:
- Project: ${project.name}
- Type: ${project.project_type}
- Stakeholder: ${project.stakeholder_type}
- Country: ${project.country}
- Therapy Area: ${project.therapy_area}

RESEARCH CONFIGURATION:
- Goal: ${config.research_goal}
- Hypothesis: ${config.research_hypothesis}
- Guided Themes: ${config.guided_themes.join(", ")}
- Dictionary: ${config.research_dictionary}

ANALYSIS FEATURES:
- Sentiment Analysis: ${config.sentiment_analysis_enabled}
- Outlier Detection: ${config.outlier_detection_enabled}
- Comparative Analysis: ${config.comparative_analysis_enabled}
- Hypothesis Validation: ${config.hypothesis_validation_enabled}

PERFORM COMPREHENSIVE PRO ADVANCED ANALYSIS:

1. **GUIDED THEMES ANALYSIS**: For each guided theme, extract evidence, sentiment, intensity, frequency, and supporting quotes
2. **EMERGING THEMES DETECTION**: Identify new themes not in guided list with significance scores
3. **SENTIMENT ANALYSIS**: Overall sentiment distribution and theme-specific sentiment scores
4. **OUTLIER DETECTION**: Identify responses that deviate significantly from group trends
5. **CONTRADICTION ANALYSIS**: Find conflicting statements within or across respondents
6. **COMPARATIVE ANALYSIS**: Compare different respondent groups and identify divergence points
7. **HYPOTHESIS VALIDATION**: Validate each hypothesis with evidence and confidence scores
8. **TRENDS & PATTERNS**: Identify within-theme and cross-theme trends with heatmap data

Return ONLY valid JSON with this structure:
{
  "guided_themes": [
    {
      "theme": "Theme name",
      "evidence": ["Evidence 1", "Evidence 2"],
      "sentiment_score": 0.5,
      "intensity": "medium",
      "frequency": 5,
      "supporting_quotes": ["Quote 1", "Quote 2"]
    }
  ],
  "emerging_themes": [
    {
      "theme": "New theme",
      "frequency": 3,
      "significance": 70,
      "supporting_quotes": ["Quote"],
      "sentiment_score": 0.2
    }
  ],
  "sentiment_analysis": {
    "overall_sentiment": "neutral",
    "sentiment_distribution": {"positive": 40, "neutral": 35, "negative": 25},
    "theme_specific_sentiment": {"Theme1": 0.3}
  },
  "outliers_contradictions": {
    "outliers": [
      {
        "respondent": "Respondent ID",
        "deviation": "Description of deviation",
        "context": "Context and rationale",
        "severity": "high|medium|low"
      }
    ],
    "contradictions": [
      {
        "theme": "Theme name",
        "conflicting_views": ["View 1", "View 2"],
        "impact": "Impact description",
        "severity": "high|medium|low"
      }
    ]
  },
  "comparative_analysis": {
    "all_respondents": "Overall insights",
    "by_target": {"Group1": "Group insights"},
    "divergence_points": [
      {
        "theme": "Theme name",
        "groups": ["Group1", "Group2"],
        "difference": "Description of difference"
      }
    ]
  },
  "hypothesis_validation": [
    {
      "hypothesis": "Hypothesis text",
      "status": "supported|partially_supported|contradicted|insufficient_data",
      "evidence": ["Evidence"],
      "confidence_score": 0.8,
      "supporting_quotes": ["Quote"]
    }
  ],
  "trends_patterns": {
    "within_theme_trends": [
      {
        "theme": "Theme name",
        "pattern": "Pattern description",
        "frequency": 5
      }
    ],
    "cross_theme_trends": [
      {
        "themes": ["Theme1", "Theme2"],
        "connection": "Connection description",
        "strength": 0.7
      }
    ],
    "heatmap_data": [
      {
        "participant": "Participant ID",
        "theme": "Theme name",
        "intensity": 0.8
      }
    ]
  }
}

TRANSCRIPTS: ${transcriptContent}`;

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
              "You are an expert qualitative research analyst specializing in Pro Advanced Analysis. Return only valid JSON with the specified comprehensive structure.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 16000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`Batch ${batchIndex} API error: ${response.status}`);
      return this.createFallbackResult(config, batchIndex);
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;

    try {
      let cleanedText = resultText.trim();

      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const jsonStart = cleanedText.indexOf("{");
      const jsonEnd = cleanedText.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No valid JSON found");
      }

      const jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonText);
    } catch (parseError) {
      console.error(`Batch ${batchIndex} parse error:`, parseError);
      return this.createFallbackResult(config, batchIndex);
    }
  }

  private createFallbackResult(
    config: AdvancedAnalysisConfig,
    batchIndex: number,
  ) {
    return {
      guided_themes: config.guided_themes.map((theme) => ({
        theme,
        evidence: [`Batch ${batchIndex + 1} analysis incomplete`],
        sentiment_score: 0,
        intensity: "medium" as const,
        frequency: 0,
        supporting_quotes: [],
      })),
      emerging_themes: [],
      sentiment_analysis: {
        overall_sentiment: "neutral" as const,
        sentiment_distribution: { positive: 33, neutral: 34, negative: 33 },
        theme_specific_sentiment: {},
      },
      outliers_contradictions: { outliers: [], contradictions: [] },
      comparative_analysis: {
        all_respondents: "",
        by_target: {},
        divergence_points: [],
      },
      hypothesis_validation: [],
      trends_patterns: {
        within_theme_trends: [],
        cross_theme_trends: [],
        heatmap_data: [],
      },
    };
  }

  private consolidateAdvancedResults(
    results: any[],
    config: AdvancedAnalysisConfig,
  ) {
    const consolidated = {
      guided_themes: [] as any[],
      emerging_themes: [] as any[],
      sentiment_analysis: {
        overall_sentiment: "neutral" as const,
        sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
        theme_specific_sentiment: {} as Record<string, number>,
      },
      outliers_contradictions: {
        outliers: [] as any[],
        contradictions: [] as any[],
      },
      comparative_analysis: {
        all_respondents: "",
        by_target: {},
        divergence_points: [] as any[],
      },
      hypothesis_validation: [] as any[],
      trends_patterns: {
        within_theme_trends: [] as any[],
        cross_theme_trends: [] as any[],
        heatmap_data: [] as any[],
      },
    };

    // Consolidate guided themes
    const themeMap = new Map<string, any>();
    results.forEach((result) => {
      result.guided_themes?.forEach((theme: any) => {
        if (themeMap.has(theme.theme)) {
          const existing = themeMap.get(theme.theme);
          existing.evidence.push(...theme.evidence);
          existing.supporting_quotes.push(...theme.supporting_quotes);
          existing.frequency += theme.frequency;
          existing.sentiment_score =
            (existing.sentiment_score + theme.sentiment_score) / 2;
        } else {
          themeMap.set(theme.theme, { ...theme });
        }
      });
    });
    consolidated.guided_themes = Array.from(themeMap.values());

    // Consolidate emerging themes
    const emergingMap = new Map<string, any>();
    results.forEach((result) => {
      result.emerging_themes?.forEach((theme: any) => {
        if (emergingMap.has(theme.theme)) {
          const existing = emergingMap.get(theme.theme);
          existing.frequency += theme.frequency;
          existing.supporting_quotes.push(...theme.supporting_quotes);
          existing.significance = Math.max(
            existing.significance,
            theme.significance,
          );
        } else {
          emergingMap.set(theme.theme, { ...theme });
        }
      });
    });
    consolidated.emerging_themes = Array.from(emergingMap.values());

    // Consolidate sentiment analysis
    let totalPositive = 0,
      totalNeutral = 0,
      totalNegative = 0;
    results.forEach((result) => {
      if (result.sentiment_analysis) {
        totalPositive +=
          result.sentiment_analysis.sentiment_distribution.positive || 0;
        totalNeutral +=
          result.sentiment_analysis.sentiment_distribution.neutral || 0;
        totalNegative +=
          result.sentiment_analysis.sentiment_distribution.negative || 0;

        Object.assign(
          consolidated.sentiment_analysis.theme_specific_sentiment,
          result.sentiment_analysis.theme_specific_sentiment || {},
        );
      }
    });

    const total = totalPositive + totalNeutral + totalNegative;
    if (total > 0) {
      consolidated.sentiment_analysis.sentiment_distribution = {
        positive: Math.round((totalPositive / total) * 100),
        neutral: Math.round((totalNeutral / total) * 100),
        negative: Math.round((totalNegative / total) * 100),
      };

      if (totalPositive > totalNeutral && totalPositive > totalNegative) {
        consolidated.sentiment_analysis.overall_sentiment = "positive";
      } else if (
        totalNegative > totalNeutral &&
        totalNegative > totalPositive
      ) {
        consolidated.sentiment_analysis.overall_sentiment = "negative";
      }
    }

    // Consolidate other sections
    results.forEach((result) => {
      if (result.outliers_contradictions) {
        consolidated.outliers_contradictions.outliers.push(
          ...(result.outliers_contradictions.outliers || []),
        );
        consolidated.outliers_contradictions.contradictions.push(
          ...(result.outliers_contradictions.contradictions || []),
        );
      }

      if (result.hypothesis_validation) {
        consolidated.hypothesis_validation.push(
          ...result.hypothesis_validation,
        );
      }

      if (result.trends_patterns) {
        consolidated.trends_patterns.within_theme_trends.push(
          ...(result.trends_patterns.within_theme_trends || []),
        );
        consolidated.trends_patterns.cross_theme_trends.push(
          ...(result.trends_patterns.cross_theme_trends || []),
        );
        consolidated.trends_patterns.heatmap_data.push(
          ...(result.trends_patterns.heatmap_data || []),
        );
      }
    });

    return consolidated;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const {
      project_id,
      config,
      batchSize = 8,
      maxConcurrency = 4,
    }: AdvancedAnalysisRequest = await req.json();

    if (!project_id || !config) {
      throw new Error("Project ID and config are required");
    }

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

    // Fetch documents
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
        JSON.stringify({
          success: false,
          error: "No processed transcripts found for analysis. Please upload documents and complete processing first.",
          documents_analyzed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter only documents that actually have content
    const usableDocuments = documents.filter((d: any) =>
      typeof d.content === "string" && d.content.trim().length > 50
    );

    if (usableDocuments.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Documents are not processed yet. Please run document processing (chunking/embeddings) and try again.",
          documents_analyzed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      `🚀 Starting Pro Advanced Analysis for ${documents.length} documents`,
    );

    // Initialize Pro Advanced processor
    const processor = new ProAdvancedProcessor(
      azureApiKey,
      azureEndpoint,
      azureDeployment,
      azureVersion,
      maxConcurrency,
      batchSize,
    );

    // Process large dataset with Pro Advanced Analysis
    const analysisResults = await processor.processLargeTranscriptSet(
      documents,
      project,
      config,
    );

    return new Response(
      JSON.stringify({
        success: true,
        results: analysisResults,
        project: project,
        documents_analyzed: documents.length,
        processing_metadata: {
          batchSize,
          maxConcurrency,
          totalBatches: Math.ceil(documents.length / batchSize),
          processingMode: "pro-advanced-analysis",
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in pro advanced analysis function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
