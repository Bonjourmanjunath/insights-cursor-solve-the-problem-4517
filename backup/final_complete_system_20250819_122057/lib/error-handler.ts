// Comprehensive Error Handling System
// This utility provides consistent error handling across the application
// Enhanced for Tempo platform integration

export interface ErrorContext {
  operation: string;
  userId?: string;
  projectId?: string;
  transcriptId?: string;
  filePath?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  retryable: boolean;
  userMessage: string;
  technicalDetails?: string;
}

export class AppError extends Error {
  public readonly errorCode: string;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    errorCode: string,
    retryable: boolean = false,
    userMessage?: string,
    context?: ErrorContext,
  ) {
    super(message);
    this.name = "AppError";
    this.errorCode = errorCode;
    this.retryable = retryable;
    this.userMessage = userMessage || message;
    this.context = context;
  }
}

// Error codes for different types of errors
export const ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID: "AUTH_INVALID",
  AUTH_EXPIRED: "AUTH_EXPIRED",

  // File upload errors
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_INVALID_TYPE: "FILE_INVALID_TYPE",
  FILE_UPLOAD_FAILED: "FILE_UPLOAD_FAILED",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",

  // Transcription errors
  TRANSCRIPTION_FAILED: "TRANSCRIPTION_FAILED",
  TRANSCRIPTION_TIMEOUT: "TRANSCRIPTION_TIMEOUT",
  TRANSCRIPTION_INVALID_LANGUAGE: "TRANSCRIPTION_INVALID_LANGUAGE",

  // Analysis errors
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
  ANALYSIS_NO_DATA: "ANALYSIS_NO_DATA",
  ANALYSIS_TIMEOUT: "ANALYSIS_TIMEOUT",

  // Database errors
  DB_CONNECTION_FAILED: "DB_CONNECTION_FAILED",
  DB_QUERY_FAILED: "DB_QUERY_FAILED",
  DB_RECORD_NOT_FOUND: "DB_RECORD_NOT_FOUND",

  // API errors
  API_UNAVAILABLE: "API_UNAVAILABLE",
  API_RATE_LIMITED: "API_RATE_LIMITED",
  API_INVALID_RESPONSE: "API_INVALID_RESPONSE",

  // Azure OpenAI errors
  AZURE_CONFIG_MISSING: "AZURE_CONFIG_MISSING",
  AZURE_DEPLOYMENT_NOT_FOUND: "AZURE_DEPLOYMENT_NOT_FOUND",
  AZURE_QUOTA_EXCEEDED: "AZURE_QUOTA_EXCEEDED",

  // Storage errors
  STORAGE_UPLOAD_FAILED: "STORAGE_UPLOAD_FAILED",
  STORAGE_DOWNLOAD_FAILED: "STORAGE_DOWNLOAD_FAILED",
  STORAGE_PERMISSION_DENIED: "STORAGE_PERMISSION_DENIED",

  // Network errors
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_OFFLINE: "NETWORK_OFFLINE",

  // General errors
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

// Error message mappings
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_REQUIRED]: "Please sign in to continue",
  [ERROR_CODES.AUTH_INVALID]: "Invalid authentication credentials",
  [ERROR_CODES.AUTH_EXPIRED]: "Your session has expired. Please sign in again",

  [ERROR_CODES.FILE_TOO_LARGE]: "File size must be less than 500MB",
  [ERROR_CODES.FILE_INVALID_TYPE]:
    "Unsupported file type. Please use MP3, MP4, WAV, or M4A files",
  [ERROR_CODES.FILE_UPLOAD_FAILED]: "Failed to upload file. Please try again",
  [ERROR_CODES.FILE_NOT_FOUND]: "File not found",

  [ERROR_CODES.TRANSCRIPTION_FAILED]: "Transcription failed. Please try again",
  [ERROR_CODES.TRANSCRIPTION_TIMEOUT]:
    "Transcription is taking longer than expected. Please check back later",
  [ERROR_CODES.TRANSCRIPTION_INVALID_LANGUAGE]:
    "Unable to detect language. Please try again",

  [ERROR_CODES.ANALYSIS_FAILED]: "Analysis failed. Please try again",
  [ERROR_CODES.ANALYSIS_NO_DATA]:
    "No data available for analysis. Please upload documents first",
  [ERROR_CODES.ANALYSIS_TIMEOUT]:
    "Analysis is taking longer than expected. Please check back later",

  [ERROR_CODES.DB_CONNECTION_FAILED]:
    "Database connection failed. Please try again",
  [ERROR_CODES.DB_QUERY_FAILED]: "Database query failed. Please try again",
  [ERROR_CODES.DB_RECORD_NOT_FOUND]: "Record not found",

  [ERROR_CODES.API_UNAVAILABLE]:
    "Service temporarily unavailable. Please try again later",
  [ERROR_CODES.API_RATE_LIMITED]:
    "Too many requests. Please wait a moment and try again",
  [ERROR_CODES.API_INVALID_RESPONSE]:
    "Invalid response from server. Please try again",

  [ERROR_CODES.AZURE_CONFIG_MISSING]:
    "AI service configuration missing. Please contact support",
  [ERROR_CODES.AZURE_DEPLOYMENT_NOT_FOUND]:
    "AI service deployment not found. Please contact support",
  [ERROR_CODES.AZURE_QUOTA_EXCEEDED]:
    "AI service quota exceeded. Please try again later",

  [ERROR_CODES.STORAGE_UPLOAD_FAILED]:
    "Failed to upload file to storage. Please try again",
  [ERROR_CODES.STORAGE_DOWNLOAD_FAILED]:
    "Failed to download file from storage. Please try again",
  [ERROR_CODES.STORAGE_PERMISSION_DENIED]:
    "Storage permission denied. Please contact support",

  [ERROR_CODES.NETWORK_TIMEOUT]:
    "Request timed out. Please check your connection and try again",
  [ERROR_CODES.NETWORK_OFFLINE]:
    "No internet connection. Please check your network and try again",

  [ERROR_CODES.UNKNOWN_ERROR]: "An unexpected error occurred. Please try again",
  [ERROR_CODES.VALIDATION_ERROR]:
    "Invalid input. Please check your data and try again",
};

// Centralized error handler
export class ErrorHandler {
  /**
   * Handle and categorize errors
   */
  static handleError(error: any, context?: ErrorContext): ErrorResponse {
    console.error("🚨 Error occurred:", {
      error: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      platform: "tempo",
    });

    // Send error to Tempo platform if available
    if (typeof window !== "undefined" && (window as any).tempoErrorHandler) {
      try {
        (window as any).tempoErrorHandler({
          message: error.message || error,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
        });
      } catch (tempoError) {
        console.warn("Failed to send error to Tempo:", tempoError);
      }
    }

    // Handle AppError instances
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        errorCode: error.errorCode,
        retryable: error.retryable,
        userMessage: error.userMessage,
        technicalDetails: context ? JSON.stringify(context) : undefined,
      };
    }

    // Handle Supabase errors
    if (error?.code) {
      return this.handleSupabaseError(error, context);
    }

    // Handle network errors
    if (error?.name === "TypeError" && error?.message?.includes("fetch")) {
      return {
        success: false,
        error: error.message,
        errorCode: ERROR_CODES.NETWORK_TIMEOUT,
        retryable: true,
        userMessage: ERROR_MESSAGES[ERROR_CODES.NETWORK_TIMEOUT],
      };
    }

    // Handle Azure OpenAI errors
    if (error?.message?.includes("Azure OpenAI")) {
      return this.handleAzureError(error, context);
    }

    // Handle file upload errors
    if (
      error?.message?.includes("file") ||
      error?.message?.includes("upload")
    ) {
      return this.handleFileError(error, context);
    }

    // Default error response
    return {
      success: false,
      error: error.message || "Unknown error occurred",
      errorCode: ERROR_CODES.UNKNOWN_ERROR,
      retryable: false,
      userMessage: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    };
  }

  /**
   * Handle Supabase-specific errors
   */
  private static handleSupabaseError(
    error: any,
    context?: ErrorContext,
  ): ErrorResponse {
    const { code, message } = error;

    switch (code) {
      case "PGRST301":
        return {
          success: false,
          error: message,
          errorCode: ERROR_CODES.AUTH_REQUIRED,
          retryable: false,
          userMessage: ERROR_MESSAGES[ERROR_CODES.AUTH_REQUIRED],
        };

      case "PGRST116":
        return {
          success: false,
          error: message,
          errorCode: ERROR_CODES.DB_RECORD_NOT_FOUND,
          retryable: false,
          userMessage: ERROR_MESSAGES[ERROR_CODES.DB_RECORD_NOT_FOUND],
        };

      case "PGRST302":
        return {
          success: false,
          error: message,
          errorCode: ERROR_CODES.DB_QUERY_FAILED,
          retryable: true,
          userMessage: ERROR_MESSAGES[ERROR_CODES.DB_QUERY_FAILED],
        };

      default:
        return {
          success: false,
          error: message,
          errorCode: ERROR_CODES.DB_QUERY_FAILED,
          retryable: true,
          userMessage: ERROR_MESSAGES[ERROR_CODES.DB_QUERY_FAILED],
        };
    }
  }

  /**
   * Handle Azure OpenAI errors
   */
  private static handleAzureError(
    error: any,
    context?: ErrorContext,
  ): ErrorResponse {
    const message = error.message || "";

    if (message.includes("configuration missing")) {
      return {
        success: false,
        error: message,
        errorCode: ERROR_CODES.AZURE_CONFIG_MISSING,
        retryable: false,
        userMessage: ERROR_MESSAGES[ERROR_CODES.AZURE_CONFIG_MISSING],
      };
    }

    if (message.includes("deployment")) {
      return {
        success: false,
        error: message,
        errorCode: ERROR_CODES.AZURE_DEPLOYMENT_NOT_FOUND,
        retryable: false,
        userMessage: ERROR_MESSAGES[ERROR_CODES.AZURE_DEPLOYMENT_NOT_FOUND],
      };
    }

    if (message.includes("quota") || message.includes("rate limit")) {
      return {
        success: false,
        error: message,
        errorCode: ERROR_CODES.AZURE_QUOTA_EXCEEDED,
        retryable: true,
        userMessage: ERROR_MESSAGES[ERROR_CODES.AZURE_QUOTA_EXCEEDED],
      };
    }

    return {
      success: false,
      error: message,
      errorCode: ERROR_CODES.API_UNAVAILABLE,
      retryable: true,
      userMessage: ERROR_MESSAGES[ERROR_CODES.API_UNAVAILABLE],
    };
  }

  /**
   * Handle file-related errors
   */
  private static handleFileError(
    error: any,
    context?: ErrorContext,
  ): ErrorResponse {
    const message = error.message || "";

    if (message.includes("size") || message.includes("500MB")) {
      return {
        success: false,
        error: message,
        errorCode: ERROR_CODES.FILE_TOO_LARGE,
        retryable: false,
        userMessage: ERROR_MESSAGES[ERROR_CODES.FILE_TOO_LARGE],
      };
    }

    if (message.includes("type") || message.includes("unsupported")) {
      return {
        success: false,
        error: message,
        errorCode: ERROR_CODES.FILE_INVALID_TYPE,
        retryable: false,
        userMessage: ERROR_MESSAGES[ERROR_CODES.FILE_INVALID_TYPE],
      };
    }

    if (message.includes("upload")) {
      return {
        success: false,
        error: message,
        errorCode: ERROR_CODES.FILE_UPLOAD_FAILED,
        retryable: true,
        userMessage: ERROR_MESSAGES[ERROR_CODES.FILE_UPLOAD_FAILED],
      };
    }

    return {
      success: false,
      error: message,
      errorCode: ERROR_CODES.FILE_UPLOAD_FAILED,
      retryable: true,
      userMessage: ERROR_MESSAGES[ERROR_CODES.FILE_UPLOAD_FAILED],
    };
  }

  /**
   * Create a retryable error
   */
  static createRetryableError(
    message: string,
    errorCode: string,
    userMessage?: string,
    context?: ErrorContext,
  ): AppError {
    return new AppError(message, errorCode, true, userMessage, context);
  }

  /**
   * Create a non-retryable error
   */
  static createNonRetryableError(
    message: string,
    errorCode: string,
    userMessage?: string,
    context?: ErrorContext,
  ): AppError {
    return new AppError(message, errorCode, false, userMessage, context);
  }

  /**
   * Validate required environment variables
   */
  static validateEnvironment(): void {
    const requiredVars = [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "FMR_AZURE_OPENAI_API_KEY",
      "FMR_AZURE_OPENAI_ENDPOINT",
    ];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      throw new AppError(
        `Missing required environment variables: ${missing.join(", ")}`,
        ERROR_CODES.AZURE_CONFIG_MISSING,
        false,
        "Application configuration is incomplete. Please contact support.",
      );
    }
  }
}

// Utility functions for common error patterns
export const ErrorUtils = {
  /**
   * Wrap async operations with error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, context);
      throw new AppError(
        errorResponse.error,
        errorResponse.errorCode,
        errorResponse.retryable,
        errorResponse.userMessage,
        context,
      );
    }
  },

  /**
   * Retry operation with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context?: ErrorContext,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorResponse = ErrorHandler.handleError(error, context);

        if (!errorResponse.retryable || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },

  /**
   * Validate file before upload
   */
  validateFile(file: File): void {
    const validTypes = [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/m4a",
      "video/mp4",
    ];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (!validTypes.includes(file.type)) {
      throw ErrorHandler.createNonRetryableError(
        `Unsupported file type: ${file.type}`,
        ERROR_CODES.FILE_INVALID_TYPE,
        ERROR_MESSAGES[ERROR_CODES.FILE_INVALID_TYPE],
      );
    }

    if (file.size > maxSize) {
      throw ErrorHandler.createNonRetryableError(
        `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of 500MB`,
        ERROR_CODES.FILE_TOO_LARGE,
        ERROR_MESSAGES[ERROR_CODES.FILE_TOO_LARGE],
      );
    }
  },
};
