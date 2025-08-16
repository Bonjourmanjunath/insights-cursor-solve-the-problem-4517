import Ajv from "ajv";
import requestSchema from "../../schemas/request.json";
import responseSchema from "../../schemas/response.json";

const ajv = new Ajv({ allErrors: true });
const validateRequestSchema = ajv.compile(requestSchema);
const validateResponseSchema = ajv.compile(responseSchema);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRequest(data: any): ValidationResult {
  // Check if data exists
  if (!data) {
    return { valid: false, error: "Request body is empty" };
  }

  // Check for required fields
  if (!data.files || !Array.isArray(data.files) || data.files.length === 0) {
    return { valid: false, error: "No transcript files provided" };
  }

  if (!data.guide) {
    return { valid: false, error: "No discussion guide provided" };
  }

  // Check file limits
  if (data.files.length > 20) {
    return { valid: false, error: "Maximum of 20 files allowed" };
  }

  // Validate against JSON schema
  const valid = validateRequestSchema(data);
  if (!valid) {
    const errors = validateRequestSchema.errors;
    const errorMessage = errors
      ? errors.map((e) => `${e.instancePath} ${e.message}`).join("; ")
      : "Invalid request format";
    return { valid: false, error: errorMessage };
  }

  // Check for required file properties
  for (const file of data.files) {
    if (!file.name || !file.label || !file.content) {
      return {
        valid: false,
        error: "Each file must have name, label, and content properties",
      };
    }

    // Check if content is too large (rough estimate)
    if (file.content.length > 1000000) {
      // ~1MB text limit
      return {
        valid: false,
        error: `File ${file.name} exceeds maximum size limit`,
      };
    }
  }

  // Check guide format if it's an array
  if (Array.isArray(data.guide)) {
    if (data.guide.length > 100) {
      return { valid: false, error: "Maximum of 100 guide questions allowed" };
    }

    for (const item of data.guide) {
      if (!item.question) {
        return {
          valid: false,
          error: "Each guide item must have a question property",
        };
      }
    }
  } else if (typeof data.guide === "string") {
    // String guide will be parsed later
    if (data.guide.length > 50000) {
      // ~50KB text limit for guide
      return {
        valid: false,
        error: "Guide text exceeds maximum size limit",
      };
    }
  } else {
    return { valid: false, error: "Guide must be an array or string" };
  }

  return { valid: true };
}

export function validateResponse(data: any): ValidationResult {
  const valid = validateResponseSchema(data);
  if (!valid) {
    const errors = validateResponseSchema.errors;
    const errorMessage = errors
      ? errors.map((e) => `${e.instancePath} ${e.message}`).join("; ")
      : "Invalid response format";
    return { valid: false, error: errorMessage };
  }
  return { valid: true };
}
