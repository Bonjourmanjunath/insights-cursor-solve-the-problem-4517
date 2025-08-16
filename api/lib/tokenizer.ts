// Simple tokenizer utility for estimating token counts
// This is a simplified version that approximates GPT tokenization

export function tokenCount(text: string): number {
  if (!text) return 0;

  // Simple approximation: ~4 characters per token for English text
  // This is a rough estimate and should be replaced with a proper tokenizer
  // like tiktoken or GPT-3-Encoder in production

  // Remove extra whitespace
  const cleanText = text.replace(/\s+/g, " ").trim();

  // Count characters and divide by 4 (approximate tokens)
  return Math.ceil(cleanText.length / 4);
}

// Note: For production use, replace this with a proper tokenizer
// Example with tiktoken:
/*
import { encoding_for_model } from 'tiktoken';

export function tokenCount(text: string): number {
  if (!text) return 0;
  
  const enc = encoding_for_model('gpt-4');
  const tokens = enc.encode(text);
  return tokens.length;
}
*/
