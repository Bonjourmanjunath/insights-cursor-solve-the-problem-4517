import { AZURE_CONFIG, buildAnalysisPrompt } from "@/lib/azure-config";

export interface AnalysisConfig {
  projectName: string;
  stakeholderType: string;
  country: string;
  therapyArea: string;
  projectType: string;
  language: string;
  transcriptText: string;
}

export interface AnalysisResult {
  fmrDishTable: any[];
  strategicThemes: any[];
  journeyTable?: any[];
  personaMap?: any[];
  behavioralTable?: any[];
  messageEvaluation?: any[];
  rawResponse: string;
}

export class AzureOpenAIService {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly deployment: string;
  private readonly version: string;

  constructor() {
    this.apiKey = AZURE_CONFIG.OPENAI.API_KEY;
    this.endpoint = AZURE_CONFIG.OPENAI.ENDPOINT;
    this.deployment = AZURE_CONFIG.OPENAI.DEPLOYMENT;
    this.version = AZURE_CONFIG.OPENAI.VERSION;
  }

  async analyzeTranscripts(config: AnalysisConfig): Promise<AnalysisResult> {
    const prompt = buildAnalysisPrompt({
      project_name: config.projectName,
      stakeholder_type: config.stakeholderType,
      country: config.country,
      therapy_area: config.therapyArea,
      project_type: config.projectType,
      language: config.language,
      transcript_text: config.transcriptText
    });

    try {
      const response = await fetch(
        `${this.endpoint}openai/deployments/${this.deployment}/chat/completions?api-version=${this.version}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You are a senior healthcare qualitative research strategist at FMR Global Health specializing in structured analysis.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 4000,
            temperature: 0.3,
            top_p: 0.9
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const analysisText = result.choices[0]?.message?.content || '';
      
      return this.parseAnalysisResult(analysisText);
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }

  private parseAnalysisResult(analysisText: string): AnalysisResult {
    // Parse the markdown tables from the GPT response
    const tables = this.extractMarkdownTables(analysisText);
    
    return {
      fmrDishTable: tables.fmrDish || [],
      strategicThemes: tables.strategicThemes || [],
      journeyTable: tables.journey,
      personaMap: tables.persona,
      behavioralTable: tables.behavioral,
      messageEvaluation: tables.message,
      rawResponse: analysisText
    };
  }

  private extractMarkdownTables(text: string): any {
    const tables: any = {};
    
    // Extract FMR Dish Table
    const fmrDishMatch = text.match(/\| Vashette \| Quote \| Summary \| Theme \| Verbatim Code \|([\s\S]*?)(?=\n\n|\n#|\Z)/);
    if (fmrDishMatch) {
      tables.fmrDish = this.parseMarkdownTable(fmrDishMatch[0], ['vashette', 'quote', 'summary', 'theme', 'verbatimCode']);
    }

    // Extract Strategic Themes
    const themesMatch = text.match(/\| Theme \| Rationale \| Supporting Quotes \|([\s\S]*?)(?=\n\n|\n#|\Z)/);
    if (themesMatch) {
      tables.strategicThemes = this.parseMarkdownTable(themesMatch[0], ['theme', 'rationale', 'supportingQuotes']);
    }

    // Extract Journey Table
    const journeyMatch = text.match(/\| Stage \| Action \| Emotion \| Touchpoint \| Quote \|([\s\S]*?)(?=\n\n|\n#|\Z)/);
    if (journeyMatch) {
      tables.journey = this.parseMarkdownTable(journeyMatch[0], ['stage', 'action', 'emotion', 'touchpoint', 'quote']);
    }

    // Extract Persona Map
    const personaMatch = text.match(/\| Trait \| Motivation \| Barrier \| Quote \|([\s\S]*?)(?=\n\n|\n#|\Z)/);
    if (personaMatch) {
      tables.persona = this.parseMarkdownTable(personaMatch[0], ['trait', 'motivation', 'barrier', 'quote']);
    }

    // Extract Behavioral Table
    const behavioralMatch = text.match(/\| Behavior \| Influencer \| Belief \| Trigger \| Quote \|([\s\S]*?)(?=\n\n|\n#|\Z)/);
    if (behavioralMatch) {
      tables.behavioral = this.parseMarkdownTable(behavioralMatch[0], ['behavior', 'influencer', 'belief', 'trigger', 'quote']);
    }

    // Extract Message Evaluation
    const messageMatch = text.match(/\| Item \| Reaction \| Emotion \| Quote \| Suggestion \|([\s\S]*?)(?=\n\n|\n#|\Z)/);
    if (messageMatch) {
      tables.message = this.parseMarkdownTable(messageMatch[0], ['item', 'reaction', 'emotion', 'quote', 'suggestion']);
    }

    return tables;
  }

  private parseMarkdownTable(tableText: string, headers: string[]): any[] {
    const lines = tableText.split('\n').filter(line => line.trim() && !line.includes('---'));
    const rows = lines.slice(1); // Skip header row
    
    return rows.map(row => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      const rowData: any = {};
      
      headers.forEach((header, index) => {
        rowData[header] = cells[index] || '';
      });
      
      return rowData;
    });
  }

  async generateProjectChat(
    projectContext: string,
    userMessage: string,
    conversationHistory: any[] = []
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant specialized in FMR Global Health qualitative research analysis. You have access to the following project context:\n\n${projectContext}\n\nProvide helpful insights and answer questions about this research project.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    try {
      const response = await fetch(
        `${this.endpoint}openai/deployments/${this.deployment}/chat/completions?api-version=${this.version}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify({
            messages,
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 0.9
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }
}

export const azureOpenAIService = new AzureOpenAIService();