// FMR Azure Configuration
// Note: These are now stored securely in environment variables

export const AZURE_CONFIG = {
  // OpenAI Configuration for Analysis
  OPENAI: {
    API_KEY: import.meta.env.VITE_AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
    ENDPOINT: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
    DEPLOYMENT: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT,
    VERSION: import.meta.env.VITE_AZURE_OPENAI_VERSION || process.env.AZURE_OPENAI_VERSION
  },
  
  // Speech Services Configuration for Transcription
  SPEECH: {
    API_KEY: import.meta.env.VITE_AZURE_SPEECH_API_KEY || process.env.AZURE_SPEECH_API_KEY,
    ENDPOINT: import.meta.env.VITE_AZURE_SPEECH_ENDPOINT || process.env.AZURE_SPEECH_ENDPOINT,
    VERSION: import.meta.env.VITE_AZURE_SPEECH_VERSION || process.env.AZURE_SPEECH_VERSION
  }
};

// FMR Prompt Template for Analysis
export const FMR_ANALYSIS_PROMPT = `You are a senior healthcare qualitative research strategist at FMR Global Health.

Your job is to analyze uploaded interview transcripts using the FMR Dish framework.

PROJECT CONFIGURATION:
- Project Name: {project_name}
- Stakeholder Type: {stakeholder_type} 
- Country: {country}
- Therapy Area: {therapy_area}
- Mode: {project_type}
- Language: {language}

OUTPUT REQUIREMENTS:
Generate clean markdown tables that are Excel-ready:

1. FMR Dish Table: | Vashette | Quote | Summary | Theme | Verbatim Code |
2. Strategic Themes: | Theme | Rationale | Supporting Quotes |
3. Journey Table (if applicable): | Stage | Action | Emotion | Touchpoint | Quote |
4. Persona Map (if applicable): | Trait | Motivation | Barrier | Quote |
5. Behavioral Table (if applicable): | Behavior | Influencer | Belief | Trigger | Quote |
6. Message Evaluation (if applicable): | Item | Reaction | Emotion | Quote | Suggestion |

ANALYSIS RULES:
- Extract major interview questions from Interviewer
- Group related Respondent answers across transcripts  
- Use clean double quotes for verbatims
- Apply mode-specific logic based on project type
- Generate Excel-exportable structured data only

TRANSCRIPT(S): {inserted_transcript_text}`;

// Export helper functions
export const buildAnalysisPrompt = (config: {
  project_name: string;
  stakeholder_type: string;
  country: string;
  therapy_area: string;
  project_type: string;
  language: string;
  transcript_text: string;
}) => {
  return FMR_ANALYSIS_PROMPT
    .replace('{project_name}', config.project_name)
    .replace('{stakeholder_type}', config.stakeholder_type)
    .replace('{country}', config.country)
    .replace('{therapy_area}', config.therapy_area)
    .replace('{project_type}', config.project_type)
    .replace('{language}', config.language)
    .replace('{inserted_transcript_text}', config.transcript_text);
};