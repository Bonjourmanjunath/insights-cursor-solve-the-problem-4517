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

    console.log(`Starting transcription for ${transcriptId}, file: ${filePath}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check file size first to decide processing strategy
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('transcripts')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }

    const fileSizeMB = fileData.size / (1024 * 1024);
    console.log(`File size: ${fileSizeMB.toFixed(2)}MB`);

    // FAST PROCESSING for files under 10MB (usually under 10 minutes audio)
    if (fileSizeMB < 10) {
      console.log('Using FAST processing for small file');
      return await processFastTranscription(supabase, transcriptId, fileData, filePath, language);
    } 
    // BACKGROUND PROCESSING for large files
    else {
      console.log('Using BACKGROUND processing for large file');
      EdgeRuntime.waitUntil(processTranscriptionInBackground(supabase, transcriptId, filePath, language));
      return new Response(JSON.stringify({
        success: true,
        message: 'Large file - processing in background',
        transcriptId,
        backgroundProcessing: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('🚨 Transcription error:', {
      error: error.message || error,
      stack: error.stack,
      transcriptId,
      timestamp: new Date().toISOString()
    });

    // Update transcript status to error
    try {
      await supabase
        .from('transcripts')
        .update({ 
          status: 'error', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', transcriptId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Failed to start transcription',
      errorCode: 'TRANSCRIPTION_FAILED',
      retryable: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Advanced multi-language detection function
function detectLanguageFromContent(text: string): string {
  const textLower = text.toLowerCase();
  
  // Character set analysis for non-Latin scripts
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text); // Hiragana, Katakana, Kanji
  const hasChinese = /[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text); // Chinese characters without Japanese
  const hasKorean = /[\uAC00-\uD7AF]/.test(text); // Hangul
  const hasArabic = /[\u0600-\u06FF]/.test(text); // Arabic script
  const hasCyrillic = /[\u0400-\u04FF]/.test(text); // Cyrillic (Russian, etc.)
  const hasThai = /[\u0E00-\u0E7F]/.test(text); // Thai
  const hasHebrew = /[\u0590-\u05FF]/.test(text); // Hebrew
  
  // Character set detection first (most reliable for non-Latin scripts)
  if (hasJapanese) return 'ja';
  if (hasChinese) return 'zh';
  if (hasKorean) return 'ko';
  if (hasArabic) return 'ar';
  if (hasCyrillic) return 'ru';
  if (hasThai) return 'th';
  if (hasHebrew) return 'he';
  
  // Keyword-based detection for Latin script languages
  const languageKeywords = {
    'it': ['che', 'gli', 'una', 'della', 'sono', 'con', 'per', 'da', 'su', 'come', 'anche', 'quali', 'essere', 'può', 'possono', 'malattia', 'questo', 'quello', 'molto', 'bene'],
    'es': ['que', 'los', 'una', 'del', 'son', 'con', 'para', 'de', 'en', 'como', 'también', 'cuales', 'ser', 'puede', 'pueden', 'enfermedad', 'este', 'muy', 'bien', 'español'],
    'fr': ['que', 'les', 'une', 'du', 'sont', 'avec', 'pour', 'de', 'sur', 'comme', 'aussi', 'quels', 'être', 'peut', 'peuvent', 'maladie', 'cette', 'très', 'bien', 'français'],
    'de': ['das', 'der', 'die', 'und', 'ist', 'mit', 'für', 'von', 'auf', 'wie', 'auch', 'welche', 'sein', 'kann', 'können', 'krankheit', 'dieser', 'sehr', 'gut', 'deutsch'],
    'pt': ['que', 'os', 'uma', 'do', 'são', 'com', 'para', 'de', 'em', 'como', 'também', 'quais', 'ser', 'pode', 'podem', 'doença', 'este', 'muito', 'bem', 'português'],
    'nl': ['dat', 'de', 'een', 'van', 'zijn', 'met', 'voor', 'op', 'als', 'ook', 'welke', 'kunnen', 'kan', 'ziekte', 'deze', 'zeer', 'goed', 'nederlands'],
    'sv': ['att', 'det', 'en', 'av', 'är', 'med', 'för', 'på', 'som', 'också', 'vilka', 'vara', 'kan', 'sjukdom', 'denna', 'mycket', 'bra', 'svenska'],
    'no': ['at', 'det', 'en', 'av', 'er', 'med', 'for', 'på', 'som', 'også', 'hvilke', 'være', 'kan', 'sykdom', 'denne', 'meget', 'godt', 'norsk'],
    'da': ['at', 'det', 'en', 'af', 'er', 'med', 'for', 'på', 'som', 'også', 'hvilke', 'være', 'kan', 'sygdom', 'denne', 'meget', 'godt', 'dansk'],
    'pl': ['że', 'to', 'jest', 'i', 'na', 'w', 'z', 'do', 'się', 'nie', 'jako', 'może', 'choroby', 'bardzo', 'dobrze', 'polski'],
    'tr': ['bu', 'bir', 'için', 'ile', 've', 'olan', 'de', 'da', 'çok', 'iyi', 'hastalık', 'türkçe', 'türk'],
    'hi': ['है', 'में', 'को', 'की', 'का', 'के', 'से', 'पर', 'यह', 'वह', 'बहुत', 'अच्छा', 'बीमारी', 'हिंदी']
  };
  
  // Count keyword matches for each language
  const scores: Record<string, number> = {};
  for (const [lang, keywords] of Object.entries(languageKeywords)) {
    scores[lang] = keywords.filter(word => textLower.includes(word)).length;
  }
  
  // Find language with highest score (minimum 3 matches)
  let bestLang = 'en';
  let bestScore = 3;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestLang = lang;
      bestScore = score;
    }
  }
  
  return bestLang;
}

async function processFastTranscription(supabase: any, transcriptId: string, fileData: any, filePath: string, language?: string) {
  try {
    console.log('⚡ FAST PROCESSING - Starting immediate transcription');
    
    // Get Azure credentials
    const AZURE_API_KEY = Deno.env.get('FMR_AZURE_TRANSCRIPTION_KEY');
    const AZURE_ENDPOINT = Deno.env.get('FMR_AZURE_TRANSCRIPTION_ENDPOINT');

    if (!AZURE_API_KEY || !AZURE_ENDPOINT) {
      throw new Error('Azure OpenAI configuration missing in secrets');
    }

    // Quick progress updates for fast processing
    await supabase.from('transcripts').update({ status: 'processing', progress: 50 }).eq('id', transcriptId);

    // Prepare form data for Azure OpenAI Whisper API - file already downloaded
    const formData = new FormData();
    formData.append('file', fileData, filePath.split('/').pop() || 'audio.mp4');
    formData.append('model', 'gpt-4o-transcribe');
    
    // Always use transcriptions endpoint - we'll handle translation separately
    if (language && language !== 'auto') {
      formData.append('language', language);
    }
    
    const azureUrl = `${AZURE_ENDPOINT.replace(/\/transcriptions.*$/, '')}/transcriptions?api-version=2025-03-01-preview`;
    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': AZURE_API_KEY,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', response.status, errorText);
      throw new Error(`Azure OpenAI transcription failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('⚡ FAST PROCESSING - Azure response received');

    // Process results immediately
    let originalText = result.text || '';
    let transcriptText = originalText;
    
    // Enhanced multi-language detection system
    let detectedLanguage = 'en'; // Default to English
    if (result.language) {
      detectedLanguage = result.language.toLowerCase().substring(0, 2);
    } else if (language && language !== 'auto') {
      detectedLanguage = language.toLowerCase().substring(0, 2);
    } else {
      // Advanced language detection with character set analysis and keyword matching
      detectedLanguage = detectLanguageFromContent(originalText);
    }
    
    const duration = result.duration || null;
    
    console.log(`⚡ FAST PROCESSING - Original text: ${originalText.substring(0, 100)}...`);
    console.log(`⚡ FAST PROCESSING - Detected language: ${detectedLanguage}`);

    // Step 2: Store original text first, then handle translation
    let englishTranslation = null;
    
    // If non-English, translate to English using Azure OpenAI Chat
    const isNonEnglish = detectedLanguage !== 'en';
    if (isNonEnglish) {
      console.log(`⚡ FAST PROCESSING - Translating ${detectedLanguage} transcript to English...`);
      
      try {
        const translationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/azure-openai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            message: `Please translate the following transcript to English while preserving the speaker format and context. Only return the translated text, no additional commentary:\n\n${originalText}`,
            projectContext: 'Translation task',
            conversationHistory: []
          }),
        });

        if (translationResponse.ok) {
          const translationData = await translationResponse.json();
          englishTranslation = translationData.message || null;
          transcriptText = englishTranslation || originalText; // Use translation for further processing
          console.log('⚡ FAST PROCESSING - Translation completed successfully');
          console.log(`⚡ FAST PROCESSING - Translated text: ${transcriptText.substring(0, 100)}...`);
        } else {
          console.log('⚡ FAST PROCESSING - Translation failed, using original transcript');
          transcriptText = originalText;
        }
      } catch (translationError) {
        console.log('⚡ FAST PROCESSING - Translation error:', translationError);
        transcriptText = originalText;
      }
    } else {
      console.log('⚡ FAST PROCESSING - English detected, no translation needed');
      transcriptText = originalText;
    }
    
    console.log(`⚡ FAST PROCESSING completed. Text length: ${transcriptText.length}, Language: ${detectedLanguage}`);

    // Store all text versions in database BEFORE enhanced processing
    await supabase
      .from('transcripts')
      .update({
        original_text: originalText,
        english_translation: englishTranslation,
        text: transcriptText, // Current working text (original or translated)
        language_detected: detectedLanguage,
        duration_seconds: duration,
        speaker_count: 2,
        progress: 75,
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    // NOW ADD I:/R: FORMATTING - call enhanced processing for proper speaker identification
    console.log('⚡ FAST PROCESSING - Starting I:/R: formatting');
    
    const { data: enhancedData, error: enhanceError } = await supabase.functions.invoke('enhanced-transcript-processing', {
      body: {
        transcriptId,
        rawTranscript: transcriptText, // Use the working text (original or translated)
        projectMetadata: {
          market: 'Global',
          specialty: 'Healthcare Professional'
        }
      }
    });

    if (enhanceError) {
      console.error('Enhanced processing error:', enhanceError);
      // Fallback: just mark as completed with basic formatting
      await supabase
        .from('transcripts')
        .update({
          transcript_content: transcriptText,
          status: 'completed',
          progress: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptId);
    } else if (enhancedData?.success) {
      console.log('⚡ FAST PROCESSING - I:/R: formatting completed');
    }

    // Return immediate results for fast processing (enhanced processing updates DB automatically)
    return new Response(JSON.stringify({
      success: true,
      transcriptId,
      text: transcriptText,
      language: detectedLanguage,
      duration,
      speakers: 2,
      fastProcessing: true,
      enhanced: enhancedData?.success || false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fast transcription:', error);
    
    // Update transcript status to error
    try {
      await supabase
        .from('transcripts')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', transcriptId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    throw error; // Re-throw to be handled by main function
  }
}

async function processTranscriptionInBackground(supabase: any, transcriptId: string, filePath: string, language?: string) {
  try {
    console.log('🐌 BACKGROUND PROCESSING - Starting for large file');
    
    // Get Azure credentials
    const AZURE_API_KEY = Deno.env.get('FMR_AZURE_TRANSCRIPTION_KEY');
    const AZURE_ENDPOINT = Deno.env.get('FMR_AZURE_TRANSCRIPTION_ENDPOINT');

    if (!AZURE_API_KEY || !AZURE_ENDPOINT) {
      throw new Error('Azure OpenAI configuration missing in secrets');
    }

    // Update transcript status to processing
    await supabase
      .from('transcripts')
      .update({ status: 'processing', progress: 25 })
      .eq('id', transcriptId);

    // Download the audio file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('transcripts')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }

    console.log(`🐌 BACKGROUND - File downloaded, size: ${fileData.size} bytes`);

    // Update progress
    await supabase
      .from('transcripts')
      .update({ progress: 50 })
      .eq('id', transcriptId);

    // Prepare form data for Azure OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', fileData, filePath.split('/').pop() || 'audio.mp4');
    formData.append('model', 'gpt-4o-transcribe');
    
    // Always use transcriptions endpoint - we'll handle translation separately
    if (language && language !== 'auto') {
      formData.append('language', language);
    }
    
    const azureUrl = `${AZURE_ENDPOINT.replace(/\/transcriptions.*$/, '')}/transcriptions?api-version=2025-03-01-preview`;
    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': AZURE_API_KEY,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', response.status, errorText);
      throw new Error(`Azure OpenAI transcription failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('🐌 BACKGROUND - Azure response received');

    // Update progress
    await supabase
      .from('transcripts')
      .update({ progress: 75 })
      .eq('id', transcriptId);

    // Process and extract text from Azure OpenAI response
    let originalText = result.text || '';
    let transcriptText = originalText;
    
    // Enhanced multi-language detection system (same as fast processing)
    let detectedLanguage = 'en'; // Default to English
    if (result.language) {
      detectedLanguage = result.language.toLowerCase().substring(0, 2);
    } else if (language && language !== 'auto') {
      detectedLanguage = language.toLowerCase().substring(0, 2);
    } else {
      // Advanced language detection with character set analysis and keyword matching
      detectedLanguage = detectLanguageFromContent(originalText);
    }
    
    const duration = result.duration || null;
    
    console.log(`🐌 BACKGROUND - Original text: ${originalText.substring(0, 100)}...`);
    console.log(`🐌 BACKGROUND - Detected language: ${detectedLanguage}`);

    // Step 2: Store original text first, then handle translation
    let englishTranslation = null;
    
    // If non-English, translate to English using Azure OpenAI Chat
    const isNonEnglish = detectedLanguage !== 'en';
    if (isNonEnglish) {
      console.log(`🐌 BACKGROUND - Translating ${detectedLanguage} transcript to English...`);
      
      try {
        const translationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/azure-openai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            message: `Please translate the following transcript to English while preserving the speaker format and context. Only return the translated text, no additional commentary:\n\n${originalText}`,
            projectContext: 'Translation task',
            conversationHistory: []
          }),
        });

        if (translationResponse.ok) {
          const translationData = await translationResponse.json();
          englishTranslation = translationData.message || null;
          transcriptText = englishTranslation || originalText; // Use translation for further processing
          console.log('🐌 BACKGROUND - Translation completed successfully');
          console.log(`🐌 BACKGROUND - Translated text: ${transcriptText.substring(0, 100)}...`);
        } else {
          console.log('🐌 BACKGROUND - Translation failed, using original transcript');
          transcriptText = originalText;
        }
      } catch (translationError) {
        console.log('🐌 BACKGROUND - Translation error:', translationError);
        transcriptText = originalText;
      }
    } else {
      console.log('🐌 BACKGROUND - English detected, no translation needed');
      transcriptText = originalText;
    }
    
    console.log(`🐌 BACKGROUND completed. Text length: ${transcriptText.length}, Language: ${detectedLanguage}`);

    // Store all text versions in database BEFORE enhanced processing
    await supabase
      .from('transcripts')
      .update({
        original_text: originalText,
        english_translation: englishTranslation,
        text: transcriptText, // Current working text (original or translated)
        language_detected: detectedLanguage,
        duration_seconds: duration,
        speaker_count: 2,
        progress: 85,
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    // NOW ADD I:/R: FORMATTING for background processing too
    console.log('🐌 BACKGROUND - Starting I:/R: formatting');
    
    const { data: enhancedData, error: enhanceError } = await supabase.functions.invoke('enhanced-transcript-processing', {
      body: {
        transcriptId,
        rawTranscript: transcriptText, // Use the working text (original or translated)
        projectMetadata: {
          market: 'Global',
          specialty: 'Healthcare Professional'
        }
      }
    });

    if (enhanceError) {
      console.error('Enhanced processing error:', enhanceError);
      // Fallback: save raw transcript if enhancement fails
      await supabase
        .from('transcripts')
        .update({
          status: 'completed',
          progress: 100,
          transcript_content: transcriptText,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptId);
    } else if (enhancedData?.success) {
      console.log('🐌 BACKGROUND - I:/R: formatting completed successfully');
    }

    console.log(`🐌 BACKGROUND transcription completed successfully for ${transcriptId}`);

  } catch (error) {
    console.error('Error in background transcription:', error);
    
    // Update transcript status to error
    try {
      await supabase
        .from('transcripts')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', transcriptId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
  }
}
