import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranscriptionRequest {
  project_id: string;
  file_name: string;
  audio_data: string; // base64 encoded
  language?: string;
  medical_terms?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with anon key for JWT validation
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Create service role client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      project_id, 
      file_name, 
      audio_data, 
      language = "en-US",
      medical_terms = []
    }: TranscriptionRequest = await req.json();

    // Validation
    if (!project_id || !file_name || !audio_data) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: project_id, file_name, audio_data"
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Processing transcription for project: ${project_id}, file: ${file_name}`);

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabaseService
      .from('speech_projects')
      .select('id, name')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found or access denied" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Estimate file size from base64
    const estimatedSize = Math.round(audio_data.length * 0.75);

    // Create recording record
    const { data: recording, error: recordingError } = await supabaseService
      .from('speech_recordings')
      .insert({
        project_id,
        user_id: user.id,
        file_name,
        file_size: estimatedSize,
        language,
        status: 'processing'
      })
      .select()
      .single();

    if (recordingError) {
      console.error('Failed to create recording:', recordingError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create recording: ${recordingError.message}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Simulate transcription processing (replace with actual Azure Speech Services)
    console.log('Starting real Azure Speech Services transcription...');
    
    // Get Azure Speech Services credentials
    const azureApiKey = Deno.env.get('AZURE_SPEECH_API_KEY');
    const azureEndpoint = Deno.env.get('AZURE_SPEECH_ENDPOINT') || 'https://francecentral.api.cognitive.microsoft.com';
    const azureRegion = Deno.env.get('AZURE_SPEECH_REGION') || 'francecentral';

    if (!azureApiKey) {
      throw new Error('Azure Speech API key not configured');
    }

    // Convert base64 to blob for Azure API
    const audioBuffer = Uint8Array.from(atob(audio_data), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });

    // Prepare form data for Azure Speech API
    const formData = new FormData();
    formData.append('file', audioBlob, file_name);
    formData.append('model', 'whisper-1');
    
    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    // Add medical terms as custom vocabulary if provided
    if (medical_terms && medical_terms.length > 0) {
      formData.append('custom_vocabulary', JSON.stringify(medical_terms));
    }

    // Call Azure Speech Services API
    const speechApiUrl = `${azureEndpoint}/speechtotext/v3.1/transcriptions:transcribe`;
    
    const azureResponse = await fetch(speechApiUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureApiKey,
      },
      body: formData
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      console.error('Azure Speech API error:', errorText);
      throw new Error(`Azure Speech API error: ${azureResponse.status} - ${errorText}`);
    }

    const azureResult = await azureResponse.json();
    const transcriptText = azureResult.text || azureResult.displayText || '';
    const detectedLanguage = azureResult.language || language || 'en-US';
    const confidence = azureResult.confidence || 0.9;
    const duration = azureResult.duration || estimatedSize / 16000; // Rough estimate

    // Format transcript in I:/R: format using Azure OpenAI
    let formattedTranscript = transcriptText;
    
    try {
      const azureOpenAIKey = Deno.env.get('FMR_AZURE_OPENAI_API_KEY');
      const azureOpenAIEndpoint = Deno.env.get('FMR_AZURE_OPENAI_ENDPOINT');
      
      if (azureOpenAIKey && azureOpenAIEndpoint) {
        const formatResponse = await fetch(`${azureOpenAIEndpoint}/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureOpenAIKey,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You are formatting a transcript into I:/R: format. I: for Interviewer/Moderator, R: for Respondent/Participant. Each speaker should be on a new line. Preserve the exact content and meaning.'
              },
              {
                role: 'user',
                content: `Format this transcript into I:/R: format:\n\n${transcriptText}`
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
          })
        });

        if (formatResponse.ok) {
          const formatResult = await formatResponse.json();
          formattedTranscript = formatResult.choices[0]?.message?.content || transcriptText;
        }
      }
    } catch (formatError) {
      console.warn('Failed to format transcript, using raw transcription:', formatError);
    }

    // Update recording with real results
    const { data: updatedRecording, error: updateError } = await supabaseService
      .from('speech_recordings')
      .update({
        transcript_text: formattedTranscript,
        language_detected: detectedLanguage,
        confidence_score: confidence,
        duration_seconds: Math.round(duration),
        speaker_count: 2, // Assume interviewer + respondent
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', recording.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update recording:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update recording: ${updateError.message}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Update project recording count
    await supabaseService
      .from('speech_projects')
      .update({
        recording_count: supabaseService.sql`recording_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id);

    console.log('Real Azure Speech transcription completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        recording: updatedRecording,
        transcription: {
          text: formattedTranscript,
          language: detectedLanguage,
          confidence: confidence,
          duration: Math.round(duration),
          speakers: 2
        },
        performance: {
          latency_ms: Date.now() - startTime
        }
      }),
      { status: 201, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("Speech Transcriber Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Transcription failed",
        performance: { latency_ms: Date.now() - startTime }
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});