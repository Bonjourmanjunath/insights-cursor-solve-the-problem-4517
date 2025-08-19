import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const azureOpenAIKey = Deno.env.get('FMR_AZURE_OPENAI_API_KEY')!;
const azureOpenAIEndpoint = Deno.env.get('FMR_AZURE_OPENAI_ENDPOINT')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TranscriptSegment {
  speaker: 'I' | 'R';
  text: string;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptId, rawTranscript, projectMetadata } = await req.json();

    console.log('Processing transcript:', transcriptId);

    // First, use GPT-4.1 to analyze and structure the transcript
    const structuredTranscript = await analyzeAndStructureTranscript(rawTranscript);
    
    // Then format it properly for FMR standards
    const formattedTranscript = await formatForFMRStandards(structuredTranscript, projectMetadata);

    // Update the database with the processed transcript - preserve existing language_detected
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        transcript_content: formattedTranscript.content,
        speaker_count: 2, // Always interviewer + respondent
        status: 'completed',
        progress: 100,
        updated_at: new Date().toISOString()
        // DON'T overwrite language_detected here - it was set correctly in azure-speech-transcribe
      })
      .eq('id', transcriptId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('Transcript processing completed successfully');

    return new Response(JSON.stringify({
      success: true,
      speakers: 2,
      language: formattedTranscript.language,
      segments: formattedTranscript.segments.length,
      duration: formattedTranscript.estimatedDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-transcript-processing:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeAndStructureTranscript(rawTranscript: string) {
  const response = await fetch(`${azureOpenAIEndpoint}/openai/deployments/gpt-4.1/chat/completions?api-version=2024-02-15-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': azureOpenAIKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: `You are an expert transcript analyst for FMR Global Health research interviews. Your task is to:

1. Analyze the raw transcript and identify speakers (Interviewer vs Respondent)
2. Structure the content into clear I: (Interviewer) and R: (Respondent) segments
3. Clean up and improve readability while preserving original meaning
4. Remove filler words and false starts but keep the natural flow of conversation
5. Ensure medical/healthcare terminology is accurate

Format Rules:
- Use "I:" for Interviewer questions/statements
- Use "R:" for Respondent answers/statements  
- Each speaker segment should be on a new line
- Preserve natural conversation flow and context
- Remove excessive "um", "uh", "you know" but keep some for authenticity
- Ensure medical terms are spelled correctly

Return the structured transcript in this exact format:
I: [Interviewer text]
R: [Respondent text]
I: [Next interviewer text]
R: [Next respondent text]

The conversation should flow naturally and make sense in a healthcare research context.`
        },
        {
          role: 'user',
          content: `Please analyze and structure this transcript:\n\n${rawTranscript}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      top_p: 0.9
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function formatForFMRStandards(structuredTranscript: string, projectMetadata: any) {
  const response = await fetch(`${azureOpenAIEndpoint}/openai/deployments/gpt-4.1/chat/completions?api-version=2024-02-15-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': azureOpenAIKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: `You are formatting a healthcare research transcript for FMR Global Health standards. 

Requirements:
1. Maintain the I:/R: format exactly
2. Ensure professional medical terminology
3. Check for consistency in healthcare context
4. Detect the primary language used
5. Estimate conversation duration based on content length
6. Clean up any remaining transcription errors

Return a JSON response with:
{
  "content": "The formatted I:/R: transcript content",
  "language": "detected language code (en, es, fr, etc.)",
  "segments": [{"speaker": "I" or "R", "text": "segment text"}],
  "estimatedDuration": "estimated minutes as number"
}

Preserve all medical context and ensure the conversation flows logically for a healthcare professional interview.`
        },
        {
          role: 'user',
          content: `Format this transcript to FMR standards:\n\n${structuredTranscript}\n\nProject context: ${JSON.stringify(projectMetadata || {})}`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI formatting error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}