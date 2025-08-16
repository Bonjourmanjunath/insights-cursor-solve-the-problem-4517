import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AZURE_OPENAI_API_KEY = Deno.env.get('FMR_AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_ENDPOINT = Deno.env.get('FMR_AZURE_OPENAI_ENDPOINT');

interface AnalysisRequest {
  transcriptId: string;
  projectContext: {
    project_name: string;
    stakeholder_type: string;
    country: string;
    therapy_area: string;
    project_type: string;
    language: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) {
      throw new Error('Azure OpenAI configuration missing');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { transcriptId, projectContext }: AnalysisRequest = await req.json();

    console.log('Starting transcript analysis for:', transcriptId);

    // Fetch transcript content
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('transcript_content, file_name')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      throw new Error('Transcript not found');
    }

    // Build analysis prompt
    const analysisPrompt = `You are an expert qualitative researcher specialized in healthcare and pharmaceutical research. Analyze the following interview transcript using the FMR Dish framework.

Project Configuration:
- Project Name: ${projectContext.project_name}
- Stakeholder Type: ${projectContext.stakeholder_type}
- Country: ${projectContext.country}
- Therapy Area: ${projectContext.therapy_area}
- Project Type: ${projectContext.project_type}
- Language: ${projectContext.language}

Transcript to analyze:
${transcript.transcript_content}

Please provide your analysis in the following structured format with markdown tables:

## FMR DISH Analysis

| Vashette | Quote | Summary | Theme | Verbatim Code |
|----------|-------|---------|--------|---------------|
| [Speaker identifier] | [Exact quote from transcript] | [Brief summary of the quote's meaning] | [Thematic category] | [Coding reference] |

## Strategic Themes

| Theme | Rationale | Supporting Quotes |
|-------|-----------|-------------------|
| [Theme name] | [Why this theme is strategically important] | [Key quotes that support this theme] |

## Patient Journey Mapping

| Stage | Action | Emotion | Touchpoint | Quote |
|-------|--------|---------|------------|-------|
| [Journey stage] | [What the patient does] | [How they feel] | [Where/how they interact] | [Supporting quote] |

## Key Insights

| Insight | Impact | Recommendation |
|---------|--------|----------------|
| [Key finding] | [Business/clinical impact] | [Actionable recommendation] |

Analysis Rules:
1. Extract actual quotes from the transcript - do not paraphrase
2. Identify themes that are relevant to ${projectContext.therapy_area} in ${projectContext.country}
3. Focus on ${projectContext.stakeholder_type} perspectives
4. Provide actionable insights for ${projectContext.project_type} projects
5. Use ${projectContext.language} terminology where appropriate
6. Ensure all analysis is grounded in the actual transcript content`;

    // Call Azure OpenAI for analysis
    const response = await fetch(`${AZURE_OPENAI_ENDPOINT}/openai/deployments/GPT-4o-mini/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert qualitative researcher specializing in healthcare analysis." },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.3,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', errorText);
      throw new Error(`Azure OpenAI API error: ${response.status}`);
    }

    const analysisResult = await response.json();
    const analysisContent = analysisResult.choices[0].message.content;

    console.log('Analysis completed successfully');

    // Parse the analysis result into structured data
    const parsedAnalysis = parseAnalysisResult(analysisContent);

    // Store analysis result in database (optional - you can create an analysis_results table)
    // For now, return the parsed analysis
    
    return new Response(JSON.stringify({
      success: true,
      analysis: parsedAnalysis,
      rawAnalysis: analysisContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in transcript-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function parseAnalysisResult(analysisText: string) {
  const result = {
    fmrDish: [],
    strategicThemes: [],
    journeyMap: [],
    keyInsights: []
  };

  try {
    // Extract FMR Dish table
    const fmrDishMatch = analysisText.match(/## FMR DISH Analysis\s*\n\n([\s\S]*?)(?=\n## |$)/i);
    if (fmrDishMatch) {
      result.fmrDish = parseMarkdownTable(fmrDishMatch[1], ['vashette', 'quote', 'summary', 'theme', 'verbatimCode']);
    }

    // Extract Strategic Themes table
    const strategicThemesMatch = analysisText.match(/## Strategic Themes\s*\n\n([\s\S]*?)(?=\n## |$)/i);
    if (strategicThemesMatch) {
      result.strategicThemes = parseMarkdownTable(strategicThemesMatch[1], ['theme', 'rationale', 'supportingQuotes']);
    }

    // Extract Journey Map table
    const journeyMapMatch = analysisText.match(/## Patient Journey Mapping\s*\n\n([\s\S]*?)(?=\n## |$)/i);
    if (journeyMapMatch) {
      result.journeyMap = parseMarkdownTable(journeyMapMatch[1], ['stage', 'action', 'emotion', 'touchpoint', 'quote']);
    }

    // Extract Key Insights table
    const keyInsightsMatch = analysisText.match(/## Key Insights\s*\n\n([\s\S]*?)(?=\n## |$)/i);
    if (keyInsightsMatch) {
      result.keyInsights = parseMarkdownTable(keyInsightsMatch[1], ['insight', 'impact', 'recommendation']);
    }
  } catch (error) {
    console.error('Error parsing analysis result:', error);
  }

  return result;
}

function parseMarkdownTable(tableText: string, headers: string[]) {
  const lines = tableText.trim().split('\n');
  const dataRows = lines.slice(2); // Skip header and separator lines
  
  return dataRows
    .filter(line => line.trim() && !line.match(/^[\|\-\s]+$/))
    .map(line => {
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] || '';
      });
      return row;
    });
}