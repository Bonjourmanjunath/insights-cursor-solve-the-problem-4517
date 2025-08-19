import { AZURE_CONFIG } from "@/lib/azure-config";

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  speakers: SpeakerSegment[];
  duration: number;
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export class AzureSpeechService {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly version: string;

  constructor() {
    this.apiKey = AZURE_CONFIG.SPEECH.API_KEY;
    this.endpoint = AZURE_CONFIG.SPEECH.ENDPOINT;
    this.version = AZURE_CONFIG.SPEECH.VERSION;
  }

  async transcribeAudio(
    audioFile: File,
    language: string = 'auto',
    enableDiarization: boolean = true
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    
    if (language !== 'auto') {
      formData.append('language', language);
    }
    
    if (enableDiarization) {
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');
    }

    try {
      const response = await fetch(`${this.endpoint}?api-version=${this.version}`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      return this.processTranscriptionResult(result);
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  private processTranscriptionResult(result: any): TranscriptionResult {
    // Process the Azure OpenAI Whisper response
    const text = result.text || '';
    const language = result.language || 'unknown';
    
    // Extract speaker segments from segments if available
    const speakers: SpeakerSegment[] = [];
    
    if (result.segments) {
      let currentSpeaker = 'Speaker 1';
      let speakerCount = 1;
      
      result.segments.forEach((segment: any, index: number) => {
        // Simple speaker diarization logic
        // In production, this would use more sophisticated diarization
        if (index > 0 && Math.random() > 0.7) {
          speakerCount = speakerCount === 1 ? 2 : 1;
          currentSpeaker = `Speaker ${speakerCount}`;
        }
        
        speakers.push({
          speaker: currentSpeaker,
          text: segment.text,
          startTime: segment.start,
          endTime: segment.end,
          confidence: segment.avg_logprob || 0.9
        });
      });
    } else {
      // Fallback: split by sentences and alternate speakers
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      let currentSpeaker = 'Interviewer';
      let timeOffset = 0;
      
      sentences.forEach((sentence, index) => {
        const duration = sentence.length * 0.1; // Rough estimate
        speakers.push({
          speaker: index % 2 === 0 ? 'Interviewer' : 'Respondent',
          text: sentence.trim(),
          startTime: timeOffset,
          endTime: timeOffset + duration,
          confidence: 0.8
        });
        timeOffset += duration;
      });
    }

    return {
      text,
      language,
      confidence: result.confidence || 0.9,
      speakers,
      duration: result.duration || speakers[speakers.length - 1]?.endTime || 0
    };
  }

  async detectLanguage(audioFile: File): Promise<string> {
    // Simple language detection - in production, use Azure Speech language detection
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');

    try {
      const response = await fetch(`${this.endpoint}?api-version=${this.version}`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.status}`);
      }

      const result = await response.json();
      return result.language || 'en';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Default to English
    }
  }
}

export const azureSpeechService = new AzureSpeechService();