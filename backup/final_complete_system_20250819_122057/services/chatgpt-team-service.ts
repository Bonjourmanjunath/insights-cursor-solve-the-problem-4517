// ChatGPT Team Service
// Handles interactions with ChatGPT Team custom GPTs

import { CHATGPT_TEAM_CONFIG, CustomGPT, getCustomGPTById } from '@/lib/chatgpt-team-config';
import { ErrorHandler, ErrorUtils, ERROR_CODES } from '@/lib/error-handler';

export interface ChatGPTTeamRequest {
  gptId: string;
  message: string;
  context?: {
    project?: any;
    analysis?: any;
    transcript?: any;
    [key: string]: any;
  };
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

export interface ChatGPTTeamResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  gptUsed?: string;
  tokensUsed?: number;
}

export class ChatGPTTeamService {
  private static instance: ChatGPTTeamService;
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;

  private constructor() {}

  static getInstance(): ChatGPTTeamService {
    if (!ChatGPTTeamService.instance) {
      ChatGPTTeamService.instance = new ChatGPTTeamService();
    }
    return ChatGPTTeamService.instance;
  }

  /**
   * Send a message to a custom GPT
   */
  async sendMessage(request: ChatGPTTeamRequest): Promise<ChatGPTTeamResponse> {
    return ErrorUtils.withRetry(async () => {
      // Validate request
      const gpt = getCustomGPTById(request.gptId);
      if (!gpt) {
        throw new Error(`Custom GPT with ID '${request.gptId}' not found`);
      }

      // Check rate limits
      await this.checkRateLimit();

      // Prepare the message with context
      const fullMessage = this.buildMessageWithContext(request, gpt);

      // Make API call
      const response = await this.makeOpenAIRequest(fullMessage, request.options);

      return {
        success: true,
        message: response.content,
        data: response,
        gptUsed: gpt.name,
        tokensUsed: response.usage?.total_tokens
      };
    }, CHATGPT_TEAM_CONFIG.TEAM.RETRY_ATTEMPTS, {
      operation: 'chatgpt_team_request',
      additionalData: { gptId: request.gptId }
    });
  }

  /**
   * Build message with context for the custom GPT
   */
  private buildMessageWithContext(request: ChatGPTTeamRequest, gpt: CustomGPT): string {
    let message = request.message;

    // Add context based on GPT type
    if (request.context) {
      const context = request.context;
      
      if (gpt.useCase === 'analysis' && context.analysis) {
        message = `Context - Analysis Data: ${JSON.stringify(context.analysis)}\n\nUser Question: ${message}`;
      }
      
      if (gpt.useCase === 'transcription' && context.transcript) {
        message = `Context - Transcript: ${context.transcript}\n\nUser Question: ${message}`;
      }
      
      if (gpt.useCase === 'chat' && context.project) {
        message = `Context - Project: ${JSON.stringify(context.project)}\n\nUser Question: ${message}`;
      }
      
      if (gpt.useCase === 'export' && context.analysis) {
        message = `Context - Analysis for Export: ${JSON.stringify(context.analysis)}\n\nUser Request: ${message}`;
      }
    }

    return message;
  }

  /**
   * Make the actual OpenAI API request
   */
  private async makeOpenAIRequest(message: string, options?: any): Promise<any> {
    const response = await fetch(`${CHATGPT_TEAM_CONFIG.OPENAI.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATGPT_TEAM_CONFIG.OPENAI.API_KEY}`,
        ...(CHATGPT_TEAM_CONFIG.OPENAI.ORG_ID && {
          'OpenAI-Organization': CHATGPT_TEAM_CONFIG.OPENAI.ORG_ID
        })
      },
      body: JSON.stringify({
        model: 'gpt-4', // or your custom model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant specialized in healthcare research analysis.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        stream: options?.stream || false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(): Promise<void> {
    if (this.activeRequests >= CHATGPT_TEAM_CONFIG.TEAM.MAX_CONCURRENT_REQUESTS) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }
    
    this.activeRequests++;
    
    // Reset after timeout
    setTimeout(() => {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
    }, CHATGPT_TEAM_CONFIG.TEAM.REQUEST_TIMEOUT);
  }

  /**
   * Get available custom GPTs
   */
  getAvailableGPTs(): CustomGPT[] {
    return CHATGPT_TEAM_CONFIG.CUSTOM_GPTs.filter(gpt => gpt.isActive);
  }

  /**
   * Get GPTs by use case
   */
  getGPTsByUseCase(useCase: CustomGPT['useCase']): CustomGPT[] {
    return this.getAvailableGPTs().filter(gpt => gpt.useCase === useCase);
  }

  /**
   * Test connection to ChatGPT Team
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.sendMessage({
        gptId: 'fmr-insights-chat',
        message: 'Hello, this is a connection test.',
        options: { maxTokens: 50 }
      });

      return {
        success: response.success,
        message: response.success ? 'Connection successful' : 'Connection failed'
      };
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, {
        operation: 'test_chatgpt_team_connection'
      });

      return {
        success: false,
        message: errorResponse.userMessage
      };
    }
  }

  /**
   * Batch process multiple requests
   */
  async batchProcess(requests: ChatGPTTeamRequest[]): Promise<ChatGPTTeamResponse[]> {
    const results: ChatGPTTeamResponse[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.sendMessage(request);
        results.push(result);
      } catch (error) {
        const errorResponse = ErrorHandler.handleError(error, {
          operation: 'batch_chatgpt_team_request',
          additionalData: { gptId: request.gptId }
        });

        results.push({
          success: false,
          message: '',
          error: errorResponse.userMessage,
          gptUsed: request.gptId
        });
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const chatGPTTeamService = ChatGPTTeamService.getInstance(); 