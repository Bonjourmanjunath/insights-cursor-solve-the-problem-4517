interface MetricsData {
  filesCount: number;
  questionsCount: number;
  tokensUsed: number;
  latencyMs: number;
  supportedByQuoteRate: number;
  coverageRate: number;
  retryCount: number;
  rateLimitHits: number;
}

export function logMetrics(metrics: MetricsData): void {
  const logLevel = process.env.LOG_LEVEL || "info";

  if (logLevel === "none") {
    return;
  }

  // Log metrics (no PII)
  console.log("FMR Dish Analysis Metrics:", {
    timestamp: new Date().toISOString(),
    filesCount: metrics.filesCount,
    questionsCount: metrics.questionsCount,
    tokensUsed: metrics.tokensUsed,
    latencyMs: metrics.latencyMs,
    supportedByQuoteRate: metrics.supportedByQuoteRate.toFixed(2),
    coverageRate: metrics.coverageRate.toFixed(2),
    retryCount: metrics.retryCount,
    rateLimitHits: metrics.rateLimitHits,
  });
}

export function logError(message: string, error: any): void {
  console.error(`ERROR: ${message}`, {
    timestamp: new Date().toISOString(),
    errorMessage: error.message,
    stack: error.stack,
  });
}

export function logWarning(message: string, details?: any): void {
  const logLevel = process.env.LOG_LEVEL || "info";

  if (logLevel === "none" || logLevel === "error") {
    return;
  }

  console.warn(`WARNING: ${message}`, {
    timestamp: new Date().toISOString(),
    details,
  });
}

export function logInfo(message: string, details?: any): void {
  const logLevel = process.env.LOG_LEVEL || "info";

  if (logLevel === "none" || logLevel === "error" || logLevel === "warning") {
    return;
  }

  console.log(`INFO: ${message}`, {
    timestamp: new Date().toISOString(),
    details,
  });
}
