import { tokenCount } from "./tokenizer";

interface TranscriptFile {
  name: string;
  label: string;
  content: string;
}

interface ProcessedTranscript {
  fileId: string;
  label: string;
  chunks: TranscriptChunk[];
}

interface TranscriptChunk {
  chunkId: string;
  content: string;
  startChar: number;
  endChar: number;
  tokenCount: number;
  windows: TextWindow[];
}

interface TextWindow {
  windowId: string;
  content: string;
  startChar: number;
  endChar: number;
  tokenCount: number;
}

export async function processTranscripts(
  files: TranscriptFile[],
): Promise<ProcessedTranscript[]> {
  return Promise.all(files.map((file) => processTranscript(file)));
}

async function processTranscript(
  file: TranscriptFile,
): Promise<ProcessedTranscript> {
  // Filter out moderator/interviewer content
  const filteredContent = filterModeratorContent(file.content);

  // Create chunks with overlap
  const chunks = createChunks(filteredContent, file.name);

  return {
    fileId: file.name,
    label: file.label,
    chunks,
  };
}

function filterModeratorContent(content: string): string {
  const lines = content.split("\n");
  const filteredLines: string[] = [];

  // Common moderator/interviewer patterns
  const moderatorPatterns = [
    /^\s*interviewer\s*:/i,
    /^\s*moderator\s*:/i,
    /^\s*facilitator\s*:/i,
    /^\s*i\s*:/i, // Often used for Interviewer
    /^\s*q\s*:/i, // Often used for Question
  ];

  // Common respondent patterns
  const respondentPatterns = [
    /^\s*respondent\s*:/i,
    /^\s*participant\s*:/i,
    /^\s*subject\s*:/i,
    /^\s*patient\s*:/i,
    /^\s*doctor\s*:/i,
    /^\s*nurse\s*:/i,
    /^\s*hcp\s*:/i,
    /^\s*r\s*:/i, // Often used for Respondent
    /^\s*p\s*:/i, // Often used for Participant
  ];

  let inModeratorSection = false;

  for (const line of lines) {
    // Check if line starts a moderator section
    const isModeratorLine = moderatorPatterns.some((pattern) =>
      pattern.test(line),
    );
    if (isModeratorLine) {
      inModeratorSection = true;
      continue;
    }

    // Check if line starts a respondent section
    const isRespondentLine = respondentPatterns.some((pattern) =>
      pattern.test(line),
    );
    if (isRespondentLine) {
      inModeratorSection = false;
    }

    // Include line if not in moderator section
    if (!inModeratorSection || isRespondentLine) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join("\n");
}

function createChunks(content: string, fileId: string): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  const TARGET_CHUNK_SIZE = 1800; // Target token count
  const OVERLAP_SIZE = 200; // Overlap token count

  let startChar = 0;
  let chunkIndex = 0;

  while (startChar < content.length) {
    // Find a good chunk end point (sentence boundary)
    let endChar = findSentenceBoundary(content, startChar + TARGET_CHUNK_SIZE);
    if (endChar <= startChar) {
      // If no good boundary found, just use the target size
      endChar = Math.min(startChar + TARGET_CHUNK_SIZE, content.length);
    }

    const chunkContent = content.substring(startChar, endChar);
    const chunkTokens = tokenCount(chunkContent);

    const chunkId = `${fileId.replace(/\s+/g, "_")}_c${chunkIndex.toString().padStart(2, "0")}`;

    // Create windows within the chunk
    const windows = createWindows(chunkContent, chunkId, startChar);

    chunks.push({
      chunkId,
      content: chunkContent,
      startChar,
      endChar,
      tokenCount: chunkTokens,
      windows,
    });

    // Move to next chunk with overlap
    const overlapStartChar = Math.max(startChar, endChar - OVERLAP_SIZE);
    startChar = overlapStartChar;
    chunkIndex++;
  }

  return chunks;
}

function createWindows(
  chunkContent: string,
  chunkId: string,
  chunkStartChar: number,
): TextWindow[] {
  const windows: TextWindow[] = [];
  const TARGET_WINDOW_SIZE = 400; // Target token count for windows
  const WINDOW_STEP = 200; // Step size between windows

  let windowStart = 0;
  let windowIndex = 0;

  while (windowStart < chunkContent.length) {
    // Find a good window end point (sentence boundary)
    let windowEnd = findSentenceBoundary(
      chunkContent,
      windowStart + TARGET_WINDOW_SIZE,
    );
    if (windowEnd <= windowStart) {
      // If no good boundary found, just use the target size
      windowEnd = Math.min(
        windowStart + TARGET_WINDOW_SIZE,
        chunkContent.length,
      );
    }

    const windowContent = chunkContent.substring(windowStart, windowEnd);
    const windowTokens = tokenCount(windowContent);

    windows.push({
      windowId: `${chunkId}_w${windowIndex}`,
      content: windowContent,
      startChar: chunkStartChar + windowStart,
      endChar: chunkStartChar + windowEnd,
      tokenCount: windowTokens,
    });

    // Move to next window with step size
    windowStart += WINDOW_STEP;
    windowIndex++;

    // Stop if we've reached the end of the chunk
    if (windowStart >= chunkContent.length) break;
  }

  return windows;
}

function findSentenceBoundary(text: string, targetPosition: number): number {
  // Look for sentence boundaries (., !, ?) near the target position
  const sentenceEndRegex = /[.!?]\s/g;
  let match;
  let bestPosition = -1;

  // Search for sentence boundaries
  while ((match = sentenceEndRegex.exec(text)) !== null) {
    const position = match.index + 1; // Include the punctuation

    // If we've gone past the target, use the last found boundary
    if (position > targetPosition && bestPosition !== -1) {
      break;
    }

    bestPosition = position;

    // If we're close enough to the target, use this boundary
    if (position >= targetPosition - 100) {
      return position;
    }
  }

  // If we found a boundary, use it
  if (bestPosition !== -1) {
    return bestPosition;
  }

  // Otherwise, look for paragraph breaks
  const paragraphBreakRegex = /\n\s*\n/g;
  while ((match = paragraphBreakRegex.exec(text)) !== null) {
    const position = match.index + match[0].length;

    // If we've gone past the target, use the last found boundary
    if (position > targetPosition && bestPosition !== -1) {
      break;
    }

    bestPosition = position;

    // If we're close enough to the target, use this boundary
    if (position >= targetPosition - 100) {
      return position;
    }
  }

  // If we found a paragraph break, use it
  if (bestPosition !== -1) {
    return bestPosition;
  }

  // If all else fails, just return the target position
  return Math.min(targetPosition, text.length);
}
