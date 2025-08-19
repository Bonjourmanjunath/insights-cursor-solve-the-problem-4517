// ChatGPT Team Integration Configuration
// This allows internal team members to use custom GPTs within the FMR Insights Navigator

export interface CustomGPT {
  id: string;
  name: string;
  description: string;
  instructions: string;
  useCase: 'analysis' | 'transcription' | 'chat' | 'export' | 'general';
  isActive: boolean;
}

export interface ChatGPTTeamConfig {
  // OpenAI API Configuration for ChatGPT Team
  OPENAI: {
    API_KEY: string;
    ORG_ID?: string; // Optional organization ID
    BASE_URL: string;
  };
  
  // Custom GPTs Configuration
  CUSTOM_GPTs: CustomGPT[];
  
  // Team Settings
  TEAM: {
    MAX_CONCURRENT_REQUESTS: number;
    REQUEST_TIMEOUT: number;
    RETRY_ATTEMPTS: number;
  };
}

// Default ChatGPT Team Configuration
export const CHATGPT_TEAM_CONFIG: ChatGPTTeamConfig = {
  OPENAI: {
    API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
    ORG_ID: import.meta.env.VITE_OPENAI_ORG_ID || '',
    BASE_URL: 'https://api.openai.com/v1'
  },
  
  CUSTOM_GPTs: [
    {
      id: 'fmr-healthcare-analyst',
      name: 'FMR Healthcare Analyst',
      description: 'Specialized in healthcare qualitative research analysis',
      instructions: `You are an expert healthcare qualitative research analyst at FMR Global Health. 
      You specialize in analyzing patient and healthcare provider interviews using the FMR Dish framework.
      
      Your expertise includes:
      - Patient journey mapping
      - Healthcare provider insights
      - Treatment decision analysis
      - Unmet needs identification
      - Behavioral driver analysis
      
      Always provide structured, actionable insights that can be exported to Excel.`,
      useCase: 'analysis',
      isActive: true
    },
    {
      id: 'fmr-transcription-specialist',
      name: 'FMR Transcription Specialist',
      description: 'Expert in medical and healthcare transcription',
      instructions: `You are a specialized transcription analyst for healthcare interviews.
      You excel at:
      - Medical terminology accuracy
      - Healthcare context understanding
      - Multi-language transcription
      - I:/R: formatting for interviews
      - Quality assurance for medical transcripts`,
      useCase: 'transcription',
      isActive: true
    },
    {
      id: 'fmr-insights-chat',
      name: 'FMR Insights Chat',
      description: 'Interactive chat assistant for research insights',
      instructions: `You are an interactive research assistant for FMR Global Health.
      You help researchers:
      - Interpret analysis results
      - Generate insights from transcripts
      - Answer questions about research methodology
      - Provide strategic recommendations
      - Export data in various formats`,
      useCase: 'chat',
      isActive: true
    },
    {
      id: 'fmr-report-generator',
      name: 'FMR Report Generator',
      description: 'Professional report generation from research data',
      instructions: `You are a professional report generator for healthcare research.
      You create:
      - Executive summaries
      - Detailed analysis reports
      - PowerPoint presentations
      - Excel data exports
      - PDF reports with proper formatting`,
      useCase: 'export',
      isActive: true
    }
  ],
  
  TEAM: {
    MAX_CONCURRENT_REQUESTS: 5,
    REQUEST_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3
  }
};

// Helper function to get custom GPT by use case
export const getCustomGPTByUseCase = (useCase: CustomGPT['useCase']): CustomGPT[] => {
  return CHATGPT_TEAM_CONFIG.CUSTOM_GPTs.filter(gpt => 
    gpt.useCase === useCase && gpt.isActive
  );
};

// Helper function to get custom GPT by ID
export const getCustomGPTById = (id: string): CustomGPT | undefined => {
  return CHATGPT_TEAM_CONFIG.CUSTOM_GPTs.find(gpt => gpt.id === id && gpt.isActive);
};

// Helper function to validate ChatGPT Team configuration
export const validateChatGPTTeamConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!CHATGPT_TEAM_CONFIG.OPENAI.API_KEY) {
    errors.push('OpenAI API key is required for ChatGPT Team integration');
  }
  
  if (!CHATGPT_TEAM_CONFIG.OPENAI.BASE_URL) {
    errors.push('OpenAI base URL is required');
  }
  
  const activeGPTs = CHATGPT_TEAM_CONFIG.CUSTOM_GPTs.filter(gpt => gpt.isActive);
  if (activeGPTs.length === 0) {
    errors.push('At least one custom GPT must be active');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export configuration
export default CHATGPT_TEAM_CONFIG; 