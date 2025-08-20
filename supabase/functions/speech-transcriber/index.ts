import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranscriptionRequest {
  project_id: string
  file_name: string
  audio_data: string // base64 encoded
  language?: string
  medical_terms?: string[]
}

interface AzureSpeechConfig {
  apiKey: string
  endpoint: string
  region: string
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

    const { project_id, file_name, audio_data, language = 'en-US', medical_terms = [] }: TranscriptionRequest = await req.json()

    // Validate project exists and belongs to user
    const { data: project, error: projectError } = await supabase
      .from('speech_projects')
      .select('*')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found or access denied')
    }

    // Create recording record
    const { data: recording, error: recordingError } = await supabase
      .from('speech_recordings')
      .insert([{
        project_id,
        user_id: user.id,
        file_name,
        file_size: Math.ceil(audio_data.length * 0.75), // Approximate size
        language,
        status: 'processing'
      }])
      .select()
      .single()

    if (recordingError) throw recordingError

    // Azure Speech Services configuration
    const azureConfig: AzureSpeechConfig = {
      apiKey: Deno.env.get('AZURE_SPEECH_API_KEY') ?? '',
      endpoint: Deno.env.get('AZURE_SPEECH_ENDPOINT') ?? '',
      region: Deno.env.get('AZURE_SPEECH_REGION') ?? ''
    }

    if (!azureConfig.apiKey || !azureConfig.endpoint) {
      throw new Error('Azure Speech Services not configured')
    }

    // Convert base64 to blob
    const audioBlob = new Blob([Uint8Array.from(atob(audio_data), c => c.charCodeAt(0))], {
      type: 'audio/wav'
    })

    // Prepare custom vocabulary for medical terms
    let customVocabulary = ''
    if (medical_terms.length > 0) {
      customVocabulary = medical_terms.join('\n')
    }

    // Call Azure Speech Services
    const speechApiUrl = `${azureConfig.endpoint}/speechtotext/v3.1/transcriptions:transcribe`
    const formData = new FormData()
    formData.append('file', audioBlob, file_name)
    formData.append('model', 'whisper-1')
    
    if (customVocabulary) {
      formData.append('custom_vocabulary', customVocabulary)
    }

    const speechResponse = await fetch(speechApiUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureConfig.apiKey,
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    })

    if (!speechResponse.ok) {
      throw new Error(`Azure Speech API error: ${speechResponse.statusText}`)
    }

    const transcriptionResult = await speechResponse.json()

    // Process transcription with Azure OpenAI for I:/R: formatting
    let formattedTranscript = transcriptionResult.text || ''
    
    if (formattedTranscript) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('AZURE_OPENAI_API_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{
              role: 'system',
              content: 'Format the transcript with I:/R: markers for interviewer and respondent. I: for interviewer questions, R: for respondent answers.'
            }, {
              role: 'user',
              content: formattedTranscript
            }],
            max_tokens: 2000,
            temperature: 0.1
          })
        })

        if (openaiResponse.ok) {
          const openaiResult = await openaiResponse.json()
          formattedTranscript = openaiResult.choices[0]?.message?.content || formattedTranscript
        }
      } catch (openaiError) {
        console.warn('OpenAI formatting failed, using raw transcript:', openaiError)
      }
    }

    // Update recording with results
    const { error: updateError } = await supabase
      .from('speech_recordings')
      .update({
        status: 'completed',
        transcript_text: formattedTranscript,
        language_detected: transcriptionResult.language || language,
        confidence_score: transcriptionResult.confidence || 0.95,
        duration_seconds: transcriptionResult.duration || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', recording.id)

    if (updateError) throw updateError

    // Update project recording count
    await supabase
      .from('speech_projects')
      .update({
        recording_count: project.recording_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id)

    return new Response(
      JSON.stringify({
        success: true,
        recording_id: recording.id,
        transcript: formattedTranscript,
        language_detected: transcriptionResult.language || language,
        confidence_score: transcriptionResult.confidence || 0.95,
        duration_seconds: transcriptionResult.duration || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Speech Transcriber Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 