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
    console.log('Simulating transcription processing...');
    
    // For now, create a mock transcript based on file name and medical terms
    const mockTranscript = `I: Good morning, thank you for joining us today. Can you tell me about your experience with ${medical_terms.length > 0 ? medical_terms[0] : 'your condition'}?

R: Good morning. Thank you for having me. I've been dealing with this condition for about two years now. Initially, it was quite challenging to understand all the medical terminology and treatment options.

I: How has your treatment journey been so far?

R: It's been a learning process. Working with my healthcare team has been essential. The ${medical_terms.length > 1 ? medical_terms[1] : 'medication'} they prescribed has helped significantly, though there were some initial side effects to manage.

I: What would you say has been most helpful in managing your condition?

R: I think the combination of proper medication, lifestyle changes, and having a supportive medical team has made the biggest difference. Understanding my condition better has also helped me make informed decisions about my care.`;

    // Update recording with mock results
    const { data: updatedRecording, error: updateError } = await supabaseService
      .from('speech_recordings')
      .update({
        transcript_text: mockTranscript,
        language_detected: language,
        confidence_score: 0.92,
        duration_seconds: 180, // 3 minutes
        speaker_count: 2,
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

    console.log('Transcription completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        recording: updatedRecording,
        transcription: {
          text: mockTranscript,
          language: language,
          confidence: 0.92,
          duration: 180,
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