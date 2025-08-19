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

interface TranscriptionResult {
  id: string;
  transcript_text: string;
  language_detected: string;
  confidence_score: number;
  duration_seconds: number;
  speaker_count: number;
  processing_time_ms: number;
}

// Enterprise-grade audio processor
class EnterpriseAudioProcessor {
  private azureApiKey: string;
  private azureEndpoint: string;
  private azureRegion: string;

  constructor() {
    this.azureApiKey = Deno.env.get("AZURE_SPEECH_API_KEY")!;
    this.azureEndpoint = Deno.env.get("AZURE_SPEECH_ENDPOINT")!;
    this.azureRegion = Deno.env.get("AZURE_SPEECH_REGION") || "eastus";

    if (!this.azureApiKey || !this.azureEndpoint) {
      throw new Error("Azure Speech Services not configured");
    }
  }

  async transcribeAudio(
    audioData: string,
    language: string = "en-US",
    medicalTerms: string[] = []
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      // Convert base64 to blob
      const audioBlob = this.base64ToBlob(audioData);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('language', language);
      formData.append('profanityOption', 'Masked');
      formData.append('addWordLevelTimestamps', 'true');
      formData.append('addSentiment', 'true');
      
      // Add medical vocabulary if provided
      if (medicalTerms.length > 0) {
        formData.append('customVocabulary', JSON.stringify(medicalTerms));
      }

      // Call Azure Speech Services
      const response = await fetch(`${this.azureEndpoint}/speechtotext/v3.1/transcriptions`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureApiKey,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure Speech API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Process Azure response
      const transcriptText = this.extractTranscriptText(result);
      const languageDetected = result.language || language;
      const confidence = this.calculateConfidence(result);
      const duration = this.extractDuration(result);
      const speakerCount = this.detectSpeakerCount(result);

      return {
        id: crypto.randomUUID(),
        transcript_text: transcriptText,
        language_detected: languageDetected,
        confidence_score: confidence,
        duration_seconds: duration,
        speaker_count: speakerCount,
        processing_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error("Transcription error:", error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  private base64ToBlob(base64: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'audio/wav' });
  }

  private extractTranscriptText(result: any): string {
    if (result.recognizedPhrases) {
      return result.recognizedPhrases
        .map((phrase: any) => phrase.nBest?.[0]?.display || '')
        .filter((text: string) => text.trim())
        .join(' ');
    }
    return result.DisplayText || result.text || '';
  }

  private calculateConfidence(result: any): number {
    if (result.recognizedPhrases) {
      const confidences = result.recognizedPhrases
        .map((phrase: any) => phrase.nBest?.[0]?.confidence || 0)
        .filter((conf: number) => conf > 0);
      
      if (confidences.length > 0) {
        return confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length;
      }
    }
    return 0.85; // Default confidence
  }

  private extractDuration(result: any): number {
    if (result.duration) {
      // Parse ISO 8601 duration (PT30.5S)
      const match = result.duration.match(/PT(\d+(?:\.\d+)?)S/);
      return match ? parseFloat(match[1]) : 0;
    }
    return 0;
  }

  private detectSpeakerCount(result: any): number {
    if (result.speakers) {
      return new Set(result.speakers.map((s: any) => s.speaker)).size;
    }
    return 1; // Default to single speaker
  }
}

// Enterprise-grade medical term enhancer
class MedicalTermEnhancer {
  static async enhanceWithMedicalTerms(
    transcript: string,
    medicalTerms: Array<{ term: string; pronunciation?: string; definition?: string }>
  ): Promise<string> {
    if (!medicalTerms.length) return transcript;

    let enhancedTranscript = transcript;

    // Replace medical terms with enhanced versions
    for (const term of medicalTerms) {
      const regex = new RegExp(`\\b${term.term}\\b`, 'gi');
      const replacement = term.pronunciation 
        ? `${term.term} [${term.pronunciation}]`
        : term.term;
      
      enhancedTranscript = enhancedTranscript.replace(regex, replacement);
    }

    return enhancedTranscript;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token", code: "AUTH_INVALID" }),
        { status: 401, headers: corsHeaders }
      );
    }

    userId = user.id;
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
          error: "Missing required fields", 
          code: "MISSING_FIELDS",
          required: ["project_id", "file_name", "audio_data"]
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseService
      .from('speech_projects')
      .select('id, name')
      .eq('id', project_id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found", code: "PROJECT_NOT_FOUND" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get user's medical dictionary
    const { data: userMedicalTerms } = await supabaseService
      .from('medical_dictionaries')
      .select('term, pronunciation, definition')
      .eq('user_id', userId);

    const allMedicalTerms = [...medical_terms, ...(userMedicalTerms || [])];

    // Initialize audio processor
    const processor = new EnterpriseAudioProcessor();

    // Create recording record
    const { data: recording, error: recordingError } = await supabaseService
      .from('speech_recordings')
      .insert({
        project_id,
        user_id: userId,
        file_name,
        file_size: Math.round(audio_data.length * 0.75), // Estimate from base64
        language,
        status: 'processing'
      })
      .select()
      .single();

    if (recordingError) {
      throw new Error(`Failed to create recording: ${recordingError.message}`);
    }

    try {
      // Process transcription
      const transcriptionResult = await processor.transcribeAudio(
        audio_data,
        language,
        allMedicalTerms.map(t => typeof t === 'string' ? t : t.term)
      );

      // Enhance transcript with medical terms
      const enhancedTranscript = await MedicalTermEnhancer.enhanceWithMedicalTerms(
        transcriptionResult.transcript_text,
        allMedicalTerms.filter(t => typeof t === 'object')
      );

      // Update recording with results
      const { data: updatedRecording, error: updateError } = await supabaseService
        .from('speech_recordings')
        .update({
          transcript_text: enhancedTranscript,
          language_detected: transcriptionResult.language_detected,
          confidence_score: transcriptionResult.confidence_score,
          duration_seconds: transcriptionResult.duration_seconds,
          speaker_count: transcriptionResult.speaker_count,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update recording: ${updateError.message}`);
      }

      // Update project recording count
      await supabaseService
        .from('speech_projects')
        .update({
          recording_count: supabaseService.sql`recording_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

      // Audit log
      await AuditLogger.log(supabaseService, userId, 'transcribe_audio', recording.id, {
        project_id,
        file_name,
        language,
        duration: transcriptionResult.duration_seconds,
        confidence: transcriptionResult.confidence_score
      });

      return new Response(
        JSON.stringify({
          success: true,
          recording: updatedRecording,
          transcription: {
            text: enhancedTranscript,
            language: transcriptionResult.language_detected,
            confidence: transcriptionResult.confidence_score,
            duration: transcriptionResult.duration_seconds,
            speakers: transcriptionResult.speaker_count
          },
          performance: {
            latency_ms: Date.now() - startTime,
            processing_time_ms: transcriptionResult.processing_time_ms
          }
        }),
        { status: 201, headers: corsHeaders }
      );

    } catch (transcriptionError) {
      // Update recording status to error
      await supabaseService
        .from('speech_recordings')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id);

      throw transcriptionError;
    }

  } catch (error: any) {
    console.error("Speech Transcriber Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Transcription failed",
        code: "TRANSCRIPTION_ERROR",
        performance: { latency_ms: Date.now() - startTime }
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});