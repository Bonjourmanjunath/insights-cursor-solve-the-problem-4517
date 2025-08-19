import { supabase } from '../integrations/supabase/client';

// Data shapes (internal)
export type Q = { id: string; text: string };
export type SubSub = { number: string; title: string; questions: Q[]; general_questions: Q[] };
export type Sub = { number: string; title: string; questions: Q[]; general_questions: Q[]; subsubsections: SubSub[] };
export type Section = { number: string; title: string; questions: Q[]; general_questions: Q[]; subsections: Sub[] };
export type Guide = { sections: Section[] };

// Constants / thresholds
const SIM_THRESHOLD = 0.78;        // embeddings assign threshold
const COVERAGE_MIN = 0.85;         // required question coverage
const TEMP = 0;                    // LLM parsing temp

export interface ParseMetrics {
  coverage: number;
  rawQL: number;
  jsonQ: number;
  sections: number;
  totalQuestions: number;
}

export interface ParseResult {
  guide: Guide;
  metrics: ParseMetrics;
}

// Main pipeline function
export async function understandGuide(input: { storagePath?: string; rawText?: string }): Promise<ParseResult> {
  try {
    console.log('Starting enterprise guide parsing...');
    
    const raw = await getText(input);               // DOCX/PDF/TXT → plain text
    const cues = detectCues(raw);                   // optional: headings, list levels, bullets

    const proto = rulePass(raw, cues);              // fast structure hints (no AI)
    const chunks = chunkBySection(raw, proto);      // array of section texts

    console.log(`Found ${chunks.length} sections to parse`);

    const fragments: Guide[] = [];
    for (const ch of chunks) {
      try {
        const fragment = await aiParse(ch);         // gpt-4.1, JSON schema, temp=0
        fragments.push(fragment);
      } catch (error) {
        console.warn('Failed to parse chunk, skipping:', error);
        // Continue with other chunks
      }
    }
    
    let guide = mergeFragments(fragments);          // concat sections; de-dup by number/title

    let { rawQL, jsonQ, coverage, anchors } = scoreCoverage(raw, guide);  // counts + anchor list
    console.log(`Initial coverage: ${coverage.toFixed(2)} (${jsonQ}/${rawQL} questions)`);
    
    if (coverage < COVERAGE_MIN) {
      console.log('Coverage below threshold, running embedding repair...');
      guide = await embeddingRepair(raw, guide, anchors);  // text-embedding-3-small cosine sim
      ({ rawQL, jsonQ, coverage } = scoreCoverage(raw, guide));
      console.log(`After embedding repair: ${coverage.toFixed(2)} (${jsonQ}/${rawQL} questions)`);
    }

    if (coverage < COVERAGE_MIN) {                  // escalate only weak sections
      console.log('Coverage still low, escalating weak sections...');
      const weak = findWeakSections(raw, guide);
      const patched = await Promise.all(weak.map(aiParseStrong)); // gpt-4.1, JSON schema
      guide = applyPatches(guide, patched);
      ({ coverage } = scoreCoverage(raw, guide));
      console.log(`After escalation: ${coverage.toFixed(2)} coverage`);
    }

    validateGuide(guide);                           // Zod GuideZ.parse
    
    const metrics: ParseMetrics = {
      coverage,
      rawQL,
      jsonQ,
      sections: guide.sections.length,
      totalQuestions: jsonQ
    };

    console.log('Guide parsing completed successfully');
    return { guide, metrics };
  } catch (error) {
    console.error('Guide parsing failed:', error);
    throw error;
  }
}

// Helper functions
async function getText({ storagePath, rawText }: any): Promise<string> {
  if (rawText) return normalize(rawText);
  const file = await storageDownload(storagePath);        // your bucket
  return await convertToText(file);                       // docx/pdf→text (existing processor)
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function detectCues(txt: string) {
  return {
    headings: findAll(/^Section\s+\d+[^\n]*$/gmi, txt),
    numbered: findAll(/^\d+(?:\.\d+)+[.)]?\s+.+$/gmi, txt),
    bullets: findAll(/^[\-\*\•]\s+.+$/gmi, txt)
  };
}

function findAll(regex: RegExp, text: string): RegExpMatchArray[] {
  const matches: RegExpMatchArray[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match);
  }
  return matches;
}

function rulePass(txt: string, cues: any) {
  // Split by Section; within each, find 4.1/4.2 etc; mark lines ending in '?'
  const sections = txt.split(/(?=^Section\s+\d+)/gmi).filter(s => s.trim());
  return { sections: sections.map((s, i) => ({ number: i + 1, blockText: s.trim() })) };
}

function chunkBySection(txt: string, proto: any): string[] {
  // Cut text into section-sized chunks using proto boundaries
  return proto.sections.map((s: any) => s.blockText);
}

async function aiParse(sectionText: string): Promise<Guide> {
  const prompt = `
You are a research guide parser. Parse the following discussion guide section into structured JSON format.

Rules:
1. Identify the section number and title
2. Extract all questions (lines ending with '?' or marked as questions)
3. Group questions into subsections if they have numbered headings (like 4.1, 4.2)
4. Mark general questions that apply to the whole section
5. Return valid JSON only

Input text:
${sectionText}

Return JSON in this exact format:
{
  "sections": [
    {
      "number": "4",
      "title": "Section Title",
      "questions": [{"id": "q1", "text": "Question text?"}],
      "general_questions": [{"id": "gq1", "text": "General question?"}],
      "subsections": [
        {
          "number": "4.1",
          "title": "Subsection Title",
          "questions": [{"id": "q2", "text": "Subsection question?"}],
          "general_questions": [],
          "subsubsections": []
        }
      ]
    }
  ]
}
`;

  const { data, error } = await supabase.functions.invoke('azure-openai-chat', {
    body: {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that parses discussion guides into structured JSON format. Always return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4.1',
      temperature: TEMP
    }
  });

  if (error) {
    throw new Error(`AI parsing failed: ${error.message}`);
  }

  if (!data?.choices?.[0]?.message?.content) {
    throw new Error('No response from AI parser');
  }

  // Extract JSON from the response
  const content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }

  const parsedGuide = JSON.parse(jsonMatch[0]);
  
  // Validate the structure
  if (!parsedGuide.sections || !Array.isArray(parsedGuide.sections)) {
    throw new Error('Invalid guide structure returned by AI');
  }

  return parsedGuide;
}

function mergeFragments(frags: Guide[]): Guide {
  // Combine; keep unique Section.number; merge subsections by number; preserve order
  const map = new Map<string, Section>();
  for (const g of frags) {
    for (const s of g.sections) {
      const k = s.number.trim();
      map.set(k, mergeSection(map.get(k), s));
    }
  }
  return { sections: Array.from(map.values()).sort((a, b) => a.number.localeCompare(b.number)) };
}

function mergeSection(existing: Section | undefined, newSection: Section): Section {
  if (!existing) return newSection;
  
  return {
    number: newSection.number,
    title: newSection.title,
    questions: [...existing.questions, ...newSection.questions],
    general_questions: [...existing.general_questions, ...newSection.general_questions],
    subsections: mergeSubsections(existing.subsections, newSection.subsections)
  };
}

function mergeSubsections(existing: Sub[], newSubs: Sub[]): Sub[] {
  const map = new Map<string, Sub>();
  
  // Add existing
  for (const sub of existing) {
    map.set(sub.number, sub);
  }
  
  // Merge new
  for (const sub of newSubs) {
    const existing = map.get(sub.number);
    if (existing) {
      map.set(sub.number, {
        ...existing,
        questions: [...existing.questions, ...sub.questions],
        general_questions: [...existing.general_questions, ...sub.general_questions]
      });
    } else {
      map.set(sub.number, sub);
    }
  }
  
  return Array.from(map.values()).sort((a, b) => a.number.localeCompare(b.number));
}

function scoreCoverage(raw: string, guide: Guide) {
  const rawQL = countQuestionLike(raw);                // lines with '?', 'Q:', bullet under heading
  const jsonQ = countGuideQuestions(guide);
  const coverage = rawQL ? Math.min(1, jsonQ / rawQL) : 1;
  const anchors = buildAnchors(guide);                 // ["Section 4: ...","4.1 Initial symptoms", ...]
  return { rawQL, jsonQ, coverage, anchors };
}

function countQuestionLike(text: string): number {
  const questionPatterns = [
    /\?$/gm,                    // Lines ending with ?
    /^Q[:\-]?\s+/gmi,          // Lines starting with Q:
    /^Question\s+\d+:/gmi,     // Lines starting with Question 1:
    /^[\-\*\•]\s+.*\?/gmi      // Bullet points ending with ?
  ];
  
  let count = 0;
  for (const pattern of questionPatterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  
  return count;
}

function countGuideQuestions(guide: Guide): number {
  let count = 0;
  for (const section of guide.sections) {
    count += section.questions.length;
    count += section.general_questions.length;
    for (const sub of section.subsections) {
      count += sub.questions.length;
      count += sub.general_questions.length;
      for (const subsub of sub.subsubsections) {
        count += subsub.questions.length;
        count += subsub.general_questions.length;
      }
    }
  }
  return count;
}

function buildAnchors(guide: Guide): string[] {
  const anchors: string[] = [];
  for (const section of guide.sections) {
    anchors.push(`Section ${section.number}: ${section.title}`);
    for (const sub of section.subsections) {
      anchors.push(`${sub.number} ${sub.title}`);
      for (const subsub of sub.subsubsections) {
        anchors.push(`${subsub.number} ${subsub.title}`);
      }
    }
  }
  return anchors;
}

async function embeddingRepair(raw: string, guide: Guide, anchors: string[]): Promise<Guide> {
  const candidates = extractUnmappedLines(raw, guide); // lines not already in JSON
  if (!candidates.length) return guide;

  console.log(`Found ${candidates.length} unmapped lines for embedding repair`);

  const vecLines = await embed(candidates);          // text-embedding-3-small
  const vecAnchors = await embed(anchors);

  const assigns = nnAssign(vecLines, vecAnchors, SIM_THRESHOLD); // cosine nearest neighbors
  const additions = buildAdditions(assigns, candidates, anchors);
  return applyAdditions(guide, additions);             // add as questions/general_questions
}

async function embed(texts: string[]): Promise<number[][]> {
  const { data, error } = await supabase.functions.invoke('azure-openai-chat', {
    body: {
      messages: [
        {
          role: 'user',
          content: `Generate embeddings for these texts:\n${texts.join('\n')}`
        }
      ],
      model: 'text-embedding-3-small'
    }
  });

  if (error) {
    throw new Error(`Embedding failed: ${error.message}`);
  }

  // This is a simplified version - you'll need to implement proper embedding calls
  // For now, return dummy embeddings
  return texts.map(() => Array(1536).fill(0).map(() => Math.random()));
}

function nnAssign(lineVecs: number[][], anchorVecs: number[][], thr: number) {
  // cosine similarity; assign each line to best anchor if sim ≥ thr
  return lineVecs.map(v => {
    let best = { idx: -1, sim: -1 };
    for (let j = 0; j < anchorVecs.length; j++) {
      const sim = cosine(v, anchorVecs[j]);
      if (sim > best.sim) best = { idx: j, sim };
    }
    return best.sim >= thr ? best.idx : -1;
  });
}

function cosine(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

function extractUnmappedLines(raw: string, guide: Guide): string[] {
  // Extract lines that look like questions but aren't in the guide
  const questionLines = raw.split('\n').filter(line => 
    line.trim().endsWith('?') || 
    /^Q[:\-]?\s+/.test(line.trim()) ||
    /^Question\s+\d+:/.test(line.trim())
  );
  
  const guideQuestions = new Set<string>();
  // Add all questions from guide to set for comparison
  // This is simplified - you'd want to normalize text for comparison
  
  return questionLines.filter(line => !guideQuestions.has(line.trim()));
}

function buildAdditions(assigns: number[], candidates: string[], anchors: string[]) {
  // Build additions based on assignments
  const additions: any[] = [];
  for (let i = 0; i < assigns.length; i++) {
    if (assigns[i] >= 0) {
      additions.push({
        anchorIndex: assigns[i],
        question: candidates[i]
      });
    }
  }
  return additions;
}

function applyAdditions(guide: Guide, additions: any[]): Guide {
  // Apply additions to the guide
  // This is simplified - you'd want to add questions to the appropriate sections
  return guide;
}

function findWeakSections(raw: string, guide: Guide) {
  // Sections whose local coverage or anchor match rate is low
  return guide.sections.filter(section => {
    const sectionText = extractSectionText(raw, section.number);
    const sectionCoverage = calculateSectionCoverage(sectionText, section);
    return sectionCoverage < COVERAGE_MIN;
  }).map(section => extractSectionText(raw, section.number));
}

function extractSectionText(raw: string, sectionNumber: string): string {
  // Extract text for a specific section
  const sectionRegex = new RegExp(`Section\\s+${sectionNumber}[^]*?(?=Section\\s+\\d+|$)`, 'i');
  const match = raw.match(sectionRegex);
  return match ? match[0] : '';
}

function calculateSectionCoverage(sectionText: string, section: Section): number {
  const rawQL = countQuestionLike(sectionText);
  const jsonQ = section.questions.length + section.general_questions.length;
  return rawQL ? Math.min(1, jsonQ / rawQL) : 1;
}

async function aiParseStrong(blockText: string): Promise<Guide> {
  // Call stronger model (e.g., 4.1) with same JSON schema on just that block
  return await aiParse(blockText); // For now, use same parser
}

function applyPatches(guide: Guide, patches: Guide[]): Guide {
  // Replace/merge only the patched sections/subsections
  return mergeFragments([guide, ...patches]);
}

function validateGuide(guide: Guide) {
  // Basic validation
  if (!guide.sections || guide.sections.length === 0) {
    throw new Error('Guide must have at least one section');
  }
  
  for (const section of guide.sections) {
    if (!section.number || !section.title) {
      throw new Error('All sections must have number and title');
    }
  }
}

// Utility functions for file handling
async function storageDownload(storagePath: string): Promise<any> {
  // Implement based on your storage setup
  throw new Error('Storage download not implemented');
}

async function convertToText(file: any): Promise<string> {
  // Implement based on your file conversion setup
  throw new Error('File conversion not implemented');
} 