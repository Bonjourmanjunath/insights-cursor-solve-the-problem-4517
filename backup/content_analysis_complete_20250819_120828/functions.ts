// Function name constants to prevent typos and em-dash issues
export const FN = {
  PING: 'ping',
  QUEUE: 'content-analysis-queue',
  WORKER: 'content-analysis-worker',
  EXCEL: 'content-analysis-excel',
  GUIDE_PARSER: 'guide-parser',
} as const;

// Safety check to catch em-dash corruption
export function validateFunctionName(name: string): void {
  if (name.includes('—') || name.includes('–')) {
    throw new Error(`Function name contains em-dash: "${name}". Use regular hyphens (-) only.`);
  }
}

// Validate all function names at module load
Object.values(FN).forEach(validateFunctionName); 