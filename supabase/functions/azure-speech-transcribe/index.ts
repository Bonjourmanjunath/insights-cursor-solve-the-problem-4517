import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  transcriptId: string;
  filePath: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let transcriptId: string | undefined;

  try {
    const requestBody = await req.json();
    transcriptId = requestBody.transcriptId;
    const filePath = requestBody.filePath;
    const language = requestBody.language;

    if (!transcriptId || !filePath) {
      throw new Error('Transcript ID and file path are required');
    }

    console.log(`🎤 Starting Azure Speech transcription for ${transcriptId}, file: ${filePath}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Download file from Supabase storage
    console.log('📥 Downloading file from storage...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('transcripts')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('❌ Storage download failed:', downloadError);
      throw new Error(`Failed to download file from storage: ${downloadError?.message || 'File not found at path: ' + filePath}`);
    }

    console.log('✅ File downloaded successfully, size:', fileData.size);

    // Step 2: Get Azure Speech Services credentials
    const azureApiKey = Deno.env.get('AZURE_SPEECH_API_KEY') || Deno.env.get('FMR_AZURE_SPEECH_API_KEY');
    const azureEndpoint = Deno.env.get('AZURE_SPEECH_ENDPOINT') || 'https://francecentral.api.cognitive.microsoft.com';
    const azureRegion = Deno.env.get('AZURE_SPEECH_REGION') || 'francecentral';

    if (!azureApiKey) {
      console.error('❌ Azure Speech API key not found in environment variables');
      throw new Error('Azure Speech Services not configured - missing API key');
    }

    console.log('🔧 Azure Speech config:', {
      endpoint: azureEndpoint,
      region: azureRegion,
      hasApiKey: !!azureApiKey
    });

    // Step 3: Update transcript status to processing
    await supabase
      .from('transcripts')
      .update({ 
        status: 'processing',
        progress: 25,
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    const fileSizeMB = fileData.size / (1024 * 1024);
    console.log(`📊 File size: ${fileSizeMB.toFixed(2)}MB`);

    // Step 4: Prepare file for Azure Speech Services
    const formData = new FormData();
    formData.append('file', fileData, filePath.split('/').pop() || 'audio.mp4');
    formData.append('model', 'whisper-1');
    
    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    // Step 5: Call Azure Speech Services API
    console.log('🚀 Calling Azure Speech Services API...');
    const speechApiUrl = `${azureEndpoint}/speechtotext/v3.0/transcriptions`;
    
    // For real-time transcription, use the simpler endpoint
    const realtimeApiUrl = `${azureEndpoint}/speechtotext/v3.1/transcriptions:transcribe`;
    
    const azureResponse = await fetch(realtimeApiUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureApiKey,
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      console.error('❌ Azure Speech API error:', {
        status: azureResponse.status,
        statusText: azureResponse.statusText,
        error: errorText,
        endpoint: realtimeApiUrl
      });
      throw new Error(`Azure Speech API error: ${azureResponse.status} - ${errorText}`);
    }

    const azureResult = await azureResponse.json();
    console.log('✅ Azure Speech API response received');

    // Step 6: Process Azure Speech results
    const transcriptText = azureResult.text || azureResult.displayText || '';
    const detectedLanguage = azureResult.language || language || 'en-US';
    const confidence = azureResult.confidence || 0.9;
    const duration = azureResult.duration || null;

    console.log('📝 Transcription results:', {
      textLength: transcriptText.length,
      language: detectedLanguage,
      confidence: confidence
    });

    // Step 7: Update transcript in database with results
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        transcript_content: transcriptText,
        text: transcriptText,
        language_detected: detectedLanguage,
        confidence_score: confidence,
        duration_seconds: duration,
        speaker_count: 2,
        status: 'completed',
        progress: 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      throw new Error(`Failed to save transcription results: ${updateError.message}`);
    }

    console.log('✅ Transcription completed successfully');

    // Step 8: Return success response
    return new Response(JSON.stringify({
      success: true,
      transcriptId,
      text: transcriptText,
      language: detectedLanguage,
      confidence: confidence,
      duration: duration,
      message: 'Transcription completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Azure Speech transcription error:', {
      error: error.message || error,
      stack: error.stack,
      transcriptId,
      timestamp: new Date().toISOString()
    });

    // Update transcript status to error
    if (transcriptId) {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        await supabase
          .from('transcripts')
          .update({ 
            status: 'error',
            progress: 0,
            updated_at: new Date().toISOString() 
          })
          .eq('id', transcriptId);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Azure Speech transcription failed',
      errorCode: 'TRANSCRIPTION_FAILED',
      transcriptId: transcriptId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Remove the old mock processing functions since we're using real Azure Speech Services
/*
async function processFastTranscription(supabase: any, transcriptId: string, fileData: any, filePath: string, language?: string) {
  // This function has been replaced with direct Azure Speech API calls above
}

async function processTranscriptionInBackground(supabase: any, transcriptId: string, filePath: string, language?: string) {
  // This function has been replaced with direct Azure Speech API calls above
}

function detectLanguageFromContent(text: string): string {
  // This function is no longer needed as Azure Speech Services handles language detection
}
*/
