import axios from "axios";
import { backOff } from "exponential-backoff";

interface OpenAIResponse {
  data: any;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  retries?: number;
  rateLimitHits?: number;
}

export class AzureOpenAIService {
  private chatEndpoint: string;
  private chatApiKey: string;
  private embedEndpoint: string;
  private embedApiKey: string;

  constructor() {
    this.chatEndpoint = process.env.AOAI_CHAT_ENDPOINT || "";
    this.chatApiKey = process.env.AOAI_CHAT_API_KEY || "";
    this.embedEndpoint = process.env.AOAI_EMBED_ENDPOINT || "";
    this.embedApiKey = process.env.AOAI_EMBED_API_KEY || "";

    if (!this.chatEndpoint || !this.chatApiKey) {
      throw new Error("Missing Azure OpenAI chat configuration");
    }

    if (!this.embedEndpoint || !this.embedApiKey) {
      throw new Error("Missing Azure OpenAI embedding configuration");
    }
  }

  async extractStructuredData(
    systemPrompt: string,
    userContent: string,
    options: {
      temperature?: number;
      responseFormat?: { type: string };
    } = {},
  ): Promise<OpenAIResponse> {
    let retries = 0;
    let rateLimitHits = 0;

    const result = await backOff(
      async () => {
        try {
          const response = await axios.post(
            this.chatEndpoint,
            {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
              ],
              temperature: options.temperature ?? 0.1,
              response_format: options.responseFormat,
              max_tokens: 1000,
            },
            {
              headers: {
                "Content-Type": "application/json",
                "api-key": this.chatApiKey,
              },
            },
          );

          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            // Handle rate limiting (HTTP 429)
            if (error.response.status === 429) {
              rateLimitHits++;

              // Get retry-after header if available
              const retryAfter = error.response.headers["retry-after"];
              if (retryAfter) {
                const waitTime = parseInt(retryAfter, 10) * 1000;
                await new Promise((resolve) => setTimeout(resolve, waitTime));
              }

              throw error; // Rethrow to trigger backoff
            }

            throw new Error(
              `Azure OpenAI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
            );
          }
          throw error;
        }
      },
      {
        numOfAttempts: 6,
        startingDelay: 400,
        timeMultiple: 2,
        maxDelay: 8000,
        jitter: "full",
        retry: (error) => {
          retries++;
          return true; // Always retry
        },
      },
    );

    return {
      data: result.choices[0]?.message?.content
        ? JSON.parse(result.choices[0].message.content)
        : {},
      usage: result.usage,
      retries,
      rateLimitHits,
    };
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        this.embedEndpoint,
        {
          input: text,
          dimensions: 1536,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": this.embedApiKey,
          },
        },
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error("Error getting embedding:", error);
      return [];
    }
  }

  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        this.embedEndpoint,
        {
          input: texts,
          dimensions: 1536,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": this.embedApiKey,
          },
        },
      );

      return response.data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error("Error getting batch embeddings:", error);
      return texts.map(() => []);
    }
  }
}

export const azureOpenAIService = new AzureOpenAIService();
