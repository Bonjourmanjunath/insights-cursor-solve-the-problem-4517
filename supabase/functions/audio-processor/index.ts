import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessingOptions {
  noise_reduction?: boolean
  volume_normalization?: boolean
  speaker_diarization?: boolean
  medical_enhancement?: boolean
  quality_assessment?: boolean
}

interface AudioProcessorRequest {
  recording_id: string
  processing_options: ProcessingOptions
}

interface QualityMetrics {
  overall_score: number
  clarity_score: number
  volume_score: number
  noise_level: number
  speaker_count: number
  duration_seconds: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid user')
    }

    const { recording_id, processing_options }: AudioProcessorRequest = await req.json()

    // Validate recording exists and belongs to user
    const { data: recording, error: recordingError } = await supabase
      .from('speech_recordings')
      .select('*')
      .eq('id', recording_id)
      .eq('user_id', user.id)
      .single()

    if (recordingError || !recording) {
      throw new Error('Recording not found or access denied')
    }

    // Update recording status to processing
    await supabase
      .from('speech_recordings')
      .update({ status: 'processing' })
      .eq('id', recording_id)

    // Simulate audio processing (in real implementation, this would use actual audio processing libraries)
    const qualityMetrics: QualityMetrics = await processAudioQuality(recording, processing_options)

    // Update recording with processing results
    const { error: updateError } = await supabase
      .from('speech_recordings')
      .update({
        status: 'completed',
        speaker_count: qualityMetrics.speaker_count,
        duration_seconds: qualityMetrics.duration_seconds,
        updated_at: new Date().toISOString()
      })
      .eq('id', recording_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        recording_id,
        quality_metrics: qualityMetrics,
        processing_options,
        message: 'Audio processing completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Audio Processor Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processAudioQuality(recording: any, options: ProcessingOptions): Promise<QualityMetrics> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Generate realistic quality metrics
  const baseScore = 0.85 + Math.random() * 0.1 // 85-95% base score
  const clarityScore = baseScore + (Math.random() - 0.5) * 0.1
  const volumeScore = 0.8 + Math.random() * 0.15
  const noiseLevel = Math.random() * 0.3 // 0-30% noise
  const speakerCount = options.speaker_diarization ? Math.floor(Math.random() * 3) + 1 : 1
  const durationSeconds = recording.duration_seconds || Math.floor(Math.random() * 300) + 30

  // Apply processing enhancements
  let overallScore = baseScore
  
  if (options.noise_reduction) {
    overallScore += 0.05
    overallScore = Math.min(overallScore, 1.0)
  }

  if (options.volume_normalization) {
    overallScore += 0.03
    overallScore = Math.min(overallScore, 1.0)
  }

  if (options.medical_enhancement) {
    overallScore += 0.02
    overallScore = Math.min(overallScore, 1.0)
  }

  return {
    overall_score: Math.round(overallScore * 100) / 100,
    clarity_score: Math.round(clarityScore * 100) / 100,
    volume_score: Math.round(volumeScore * 100) / 100,
    noise_level: Math.round(noiseLevel * 100) / 100,
    speaker_count: speakerCount,
    duration_seconds: durationSeconds
  }
} 