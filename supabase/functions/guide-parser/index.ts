import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "npm:openai";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Azure OpenAI client with deployment path baked in
function azureClientFor(deployment: string) {
  const endpoint   = Deno.env.get("AZURE_OPENAI_ENDPOINT")!;      // e.g. https://newfmr.openai.azure.com/
  const apiKey     = Deno.env.get("AZURE_OPENAI_API_KEY")!;
  const apiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION") ?? "2025-01-01-preview";
  return new OpenAI({
    apiKey,
    baseURL: `${endpoint}openai/deployments/${deployment}`,
    defaultHeaders: { "api-key": apiKey },
    defaultQuery:   { "api-version": apiVersion },
  });
}

const DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "gpt-4o-mini"; // e.g. gpt-4o-mini



console.log("🔧 Edge function loaded with config:");
console.log("  AZURE_ENDPOINT:", Deno.env.get("AZURE_OPENAI_ENDPOINT") ? "SET" : "NOT SET");
console.log("  AZURE_DEPLOYMENT:", DEPLOYMENT, "(default parsing deployment)");
console.log("  AZURE_API_KEY:", Deno.env.get("AZURE_OPENAI_API_KEY") ? "SET" : "NOT SET");

// Question detection patterns
const Q_LEXEMES = /^(how|what|why|which|when|where|who|whom|do|does|did|is|are|can|could|would|should|tell|describe|explain|walk|share|list|name|rank|identify|compare|contrast|outline|summarize|give|provide)\b/i;
const PROBE_LEXEMES = /^(probe|prompt|follow[- ]?up|if not mentioned|challenge|ask)/i;

// Section header detection
const H_SECTION = [
  /^section\s*[A-Z]?\s*[:\-–]\s*(.+)$/i,
  /^[A-Z]\.\s+(.+?)(\(\s*\d+\s*min[s]?\s*\))?$/m,     // "A. Introduction (max. 5 min)"
  /^section\s+\d+\s*[:\-–]\s*(.+)$/i
];

const H_SUBSECTION = [
  /^(?:sub-?section|part)\s*[A-Z0-9]+[:\-–]\s*(.+)$/i,
  /^([1-9][0-9]*\.)\s+(.+)$/                            // "1. …"
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // Check for authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, error: "Authorization header required" }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text?.trim()) return json({ ok:false, error:"body.text is required" });

    console.log("📝 Processing guide text, length:", text.length);

    // Step 1: Normalize the text
    const normalizedText = normalizeGuide(text);
    console.log("🔧 Text normalized");

    // Step 2: Extract sections using heuristic detection
    const sections = extractSections(normalizedText);
    console.log(`📋 Found ${sections.length} sections`);

    // Step 3: Extract questions from each section
    const processedSections = sections.map((section, index) => {
      const result = extractQuestionsFromSection(section.content, index + 1);
      return {
        id: `S${index + 1}`,
        title: section.title,
        duration_min: section.duration_min,
        audience: section.audience,
        questions: result.questions,
        subsections: result.subsections
      };
    });

    // Step 4: Calculate coverage
    const totalQuestions = processedSections.reduce((sum, section) => 
      sum + section.questions.length + (section.subsections?.reduce((s, sub) => s + sub.questions.length, 0) || 0), 0
    );
    
    const coverage = computeCoverage(text, totalQuestions);
    console.log(`📊 Coverage: ${(coverage * 100).toFixed(1)}% (${totalQuestions} questions extracted)`);

    const guide = { sections: processedSections };

    return json({ 
      ok: true, 
      guide, 
      stats: { 
        sections: sections.length, 
        questions: totalQuestions,
        coverage: coverage,
        rawQuestions: countRawQuestions(text)
      } 
    });
  } catch (e:any) {
    console.error("❌ Error processing guide:", e);
    return json({ ok:false, error: e?.message || String(e) });
  }
});

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
    ...init,
  });
}

// ---------- Helper Functions ----------

function normalizeGuide(raw: string) {
  return raw
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[•●○]\s*/g, '- ')  // Word bullets → hyphen
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    // unwrap soft line breaks inside a bullet; keep blank lines between blocks
    .replace(/-\s+[^\n]*\n(?!\n|- )/g, m => m.replace(/\n/g, ' '));
}

function groupBulletBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let cur: string[] = [];
  const flush = () => { if (cur.length) { blocks.push(cur); cur = []; } };
  for (const ln of lines) {
    const line = ln.trim();
    if (!line) { flush(); continue; }
    if (/^-\s+/.test(line)) { cur.push(line.replace(/^-+\s+/, '')); }
    else flush();
  }
  flush();
  return blocks;
}

function bulletToQuestions(bullet: string): string[] {
  // split on '? ' but keep the '?'
  const parts: string[] = [];
  let remain = bullet.trim();
  while (true) {
    const idx = remain.indexOf('?');
    if (idx === -1) break;
    parts.push(remain.slice(0, idx + 1).trim());
    remain = remain.slice(idx + 1).trim();
  }
  if (remain) parts.push(remain);

  return parts.map(p => {
    // If it already looks like a question, keep it
    if (/\?\s*$/.test(p) || Q_LEXEMES.test(p)) return p.replace(/\s*\?*$/, '?');
    // Imperative prompts without '?'
    if (/^(please|walk|describe|explain|list|name|rank|share|outline|summarize|give|provide)\b/i.test(p)) {
      return p.replace(/\.*\s*$/, '?');
    }
    // Very short or "probe" lines become probes (caller can attach to previous)
    return p;
  });
}

function pickAudience(line: string): string[] | null {
  const a: string[] = [];
  if (/\(all targets?\)/i.test(line)) a.push('All targets');
  if (/\(hospital targets?\)/i.test(line)) a.push('Hospital targets');
  if (/\(business targets?\)/i.test(line)) a.push('Business targets');
  return a.length ? a : null;
}

function isSubsectionTitle(line: string) {
  // e.g., "Tendering overview", "Selection criteria and influencing factors"
  return /^[A-Z].{2,50}$/.test(line) && !/[.?!]$/.test(line) && !/^section/i.test(line);
}

function extractDuration(line: string): number | undefined {
  const match = line.match(/\((\d+)\s*min[s]?\)/i);
  return match ? parseInt(match[1]) : undefined;
}

function extractSections(text: string): Array<{title: string, content: string, duration_min?: number, audience?: string[]}> {
  const lines = text.split('\n');
  const sections: Array<{title: string, content: string, duration_min?: number, audience?: string[]}> = [];
  
  let currentSection: {title: string, content: string, duration_min?: number, audience?: string[]} | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if this is a section header
    let isSection = false;
    let sectionTitle = '';
    
    for (const pattern of H_SECTION) {
      const match = trimmed.match(pattern);
      if (match) {
        isSection = true;
        sectionTitle = match[1] || match[0];
        break;
      }
    }
    
    // Also check for lettered sections like "A. Introduction"
    if (!isSection && /^[A-Z]\.\s+/.test(trimmed)) {
      isSection = true;
      sectionTitle = trimmed.replace(/^[A-Z]\.\s+/, '');
    }

    if (isSection) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentContent.join('\n');
        sections.push(currentSection);
      }
      
      // Start new section
      const duration = extractDuration(trimmed);
      const audience = pickAudience(trimmed);
      currentSection = {
        title: sectionTitle.trim(),
        content: '',
        duration_min: duration,
        audience: audience || undefined
      };
      currentContent = [];
    } else {
      // Add to current section content
      if (currentSection) {
        currentContent.push(line);
      }
    }
  }
  
  // Add the last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    sections.push(currentSection);
  }
  
  // If no sections found, treat entire text as one section
  if (sections.length === 0) {
    sections.push({
      title: "General",
      content: text
    });
  }
  
  return sections;
}

type Question = { id: string; text: string; probes?: string[]; audience?: string[] };
type Sub = { id: string; title: string; questions: Question[] };
type Section = { id: string; title: string; questions: Question[]; subsections?: Sub[]; audience?: string[]; };

function extractQuestionsFromSection(sectionText: string, secIndex: number): { questions: Question[]; subsections: Sub[] } {
  const lines = normalizeGuide(sectionText).split(/\n/);
  const bulletBlocks = groupBulletBlocks(lines);

  const questions: Question[] = [];
  const subsections: Sub[] = [];

  let curAud: string[] | undefined;
  let curSub: Sub | null = null;
  let qCounter = 0;

  const pushQ = (txt: string) => {
    if (!txt.trim()) return;
    qCounter++;
    const q: Question = { id: `S${secIndex}-Q${qCounter.toString().padStart(2,'0')}`, text: txt.trim() };
    if (curAud?.length) q.audience = [...curAud];
    if (curSub) curSub.questions.push(q); else questions.push(q);
  };

  // scan line-by-line to capture audience/subsection context
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();

    // audience switches live on their own line or embedded
    const aud = pickAudience(raw);
    if (aud) { curAud = aud; continue; }

    // subsection if a short Capitalized line followed by bullets
    if (isSubsectionTitle(raw) && /^-\s+/.test(lines[i+1] ?? '')) {
      curSub = { id: `S${secIndex}-P${(subsections.length+1)}`, title: raw, questions: [] };
      subsections.push(curSub);
      continue;
    }
  }

  // now convert bullets to questions
  for (const block of bulletBlocks) {
    // each bullet in the block becomes one or more questions
    for (const b of block) {
      if (PROBE_LEXEMES.test(b)) {
        // attach as probe to last question in scope
        const target = curSub && curSub.questions.length ? curSub.questions : questions;
        if (target.length) {
          const last = target[target.length - 1];
          (last.probes ||= []).push(b.replace(PROBE_LEXEMES, '').trim());
        }
        continue;
      }
      const qs = bulletToQuestions(b);
      for (const q of qs) {
        // if it still isn't clearly a question, treat as probe to the previous item
        if (!/\?\s*$/.test(q) && !Q_LEXEMES.test(q)) {
          const target = curSub && curSub.questions.length ? curSub.questions : questions;
          if (target.length) (target[target.length-1].probes ||= []).push(q);
        } else {
          pushQ(q);
        }
      }
    }
  }

  return { questions, subsections };
}

function computeCoverage(rawText: string, extractedCount: number) {
  const rawCandidates = (normalizeGuide(rawText)
    .split(/\n/)
    .filter(l => /^-\s+/.test(l) || Q_LEXEMES.test(l.trim()) || /\?$/.test(l)).length) || 1;
  return Math.min(1, extractedCount / rawCandidates);
}

function countRawQuestions(text: string): number {
  const normalized = normalizeGuide(text);
  return normalized
    .split(/\n/)
    .filter(l => /^-\s+/.test(l) || Q_LEXEMES.test(l.trim()) || /\?$/.test(l)).length;
}



 