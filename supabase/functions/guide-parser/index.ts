// supabase/functions/guide-parser/index.ts
// Deno Edge Function — parses discussion guides (copy‑paste text) into
// a Content‑Analysis‑Ready structure with robust rules + AI fallback (Azure OpenAI)
//
// Input (POST JSON): { text: string }
// Output: { guide, metrics, analysis_ready }
//
// Env vars required (Azure OpenAI):
// - AZURE_OPENAI_ENDPOINT (e.g., https://your-resource.openai.azure.com)
// - AZURE_OPENAI_KEY
// - AZURE_OPENAI_DEPLOYMENT (e.g., gpt-4o-mini / gpt-4.1-mini)

// deno-lint-ignore-file no-explicit-any

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/** ----------------------------- Types & Schema ----------------------------- */

export type GuideQuestion = {
  id: string;
  text: string;
  probes?: string[];
  mandatory?: boolean;
  tags?: string[];
  timeMin?: number | null;
  subsection?: string | null; // convenience duplication for flatted export
};

export type GuideSubsection = {
  ref: string; // e.g., "3.1" or "A.1"
  title: string;
  timeMin?: number | null;
  questions: GuideQuestion[];
  notes?: string[];
};

export type GuideSection = {
  ref: string; // e.g., "Section 3" or "Abschnitt B" or "Section A"
  title: string;
  timeMin?: number | null;
  questions: GuideQuestion[]; // questions directly under the section (no subsection)
  subsections?: GuideSubsection[];
  notes?: string[];
};

export type SimpleGuide = {
  version: "ContentAnalysisReady.v1";
  languageHints: string[]; // e.g., ["en","de","fr"]
  sections: GuideSection[];
  meta?: Record<string, any>;
};

export type ParseMetrics = {
  totalLines: number;
  candidateQuestionLines: number; // lines that look like questions/prompts
  extractedQuestions: number;
  sections: number;
  subsections: number;
  coverage: number; // extractedQuestions / max(1, candidateQuestionLines)
  source: "rules" | "ai" | "rules+ai";
  unparsedSamples?: string[]; // up to N examples of lines we skipped
};

/** ----------------------------- Utilities ----------------------------- */

function cleanPastedText(input: string): string {
  let t = input ?? "";
  // Normalize newlines and whitespace
  t = t.replace(/\r\n?/g, "\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");

  // Normalize bullets to "- "
  t = t.replace(/^[\t ]*[•▪◦·\-–—]\s+/gim, "- ");

  // Normalize numbered bullets: "1)" / "1." => "1 "
  t = t.replace(/^\s*(\(?\d+\)|\d+\.)\s+/gim, (m) => m.replace(/[().]/g, "").trim() + " ");

  // Normalize quotes/dashes
  t = t.replace(/[""]/g, '"').replace(/['']/g, "'");
  t = t.replace(/[–—]/g, "-");

  // Remove frequent header/footer noise
  t = t.replace(/^\s*Page\s+\d+(\s+of\s+\d+)?\s*$/gim, "");
  t = t.replace(/^\s*(Confidential|Draft|Do not distribute)\s*$/gim, "");

  // Merge soft wraps: lowercase → lowercase / comma / semicolon
  t = t.replace(/([a-z,;:])\n([a-z(])/g, "$1 $2");

  // Normalize section cues (English/German/Spanish/French)
  t = t.replace(/^section\s+([a-z\d]+)[\s:.-]*/gim, "Section $1: ");
  t = t.replace(/^abschnitt\s+([a-z\d]+)[\s:.-]*/gim, "Abschnitt $1: ");
  t = t.replace(/^sección\s+([a-z\d]+)[\s:.-]*/gim, "Sección $1: ");
  t = t.replace(/^section\s+([A-Z])\s*[\-–]\s*/gm, "Section $1: ");

  // Ensure Moderator labels are consistent
  t = t.replace(/^moderator[:\-]\s*/gim, "Moderator: ");

  return t.trim();
}

const LANG_HINT_WORDS = {
  en: ["Section", "Moderator", "Wrap-up", "Warm Up", "minutes", "min"],
  de: ["Abschnitt", "Moderator", "Minuten", "Einleitung"],
  fr: ["Section", "Modérateur", "minutes", "Conclusion"],
  es: ["Sección", "Moderador", "minutos"],
  ro: ["Secțiunea", "Moderator", "minute"],
};

function detectLanguageHints(text: string): string[] {
  const hints: string[] = [];
  const lower = text.toLowerCase();
  for (const [lang, words] of Object.entries(LANG_HINT_WORDS)) {
    for (const w of words) {
      if (lower.includes(w.toLowerCase())) { hints.push(lang); break; }
    }
  }
  return Array.from(new Set(hints));
}

/** ----------------------------- Regex Library ----------------------------- */

// Sections (EN, DE, ES + generic)
const sectionRegexes: RegExp[] = [
  /^Section\s+([A-Z\d]+)\s*[:\-]\s*(.+?)(?:\s*[\-–]\s*(\d+)\s*(?:min(?:utes)?|mins?)\.?)?$/i, // Section 3: Title – 7 min
  /^Section\s+([A-Z])\s*[:\-]\s*(.+)$/i, // Section A – Warm Up
  /^Abschnitt\s+([A-Z\d]+)\s*[:\-]?\s*(.+?)(?:\s*\((\d+)\s*Min(?:ute[n]?)?\))?$/i, // Abschnitt B: Titel (5 Minuten)
  /^Sección\s+([A-Z\d]+)\s*[:\-]?\s*(.+?)(?:\s*\((\d+)\s*min(?:utos)?\))?$/i,
];

// Subsections like "3.1 Evolution:", "5.2 Innovation" or nested 2.1.3
const subsectionRegex = /^(\d+(?:\.\d+)+)\s*[:\-]?\s*(.+)$/i;

// Time extraction helpers
const timeMinRegex = /(\d+)\s*(?:min(?:ute[n]?|utes)?|mins?)/i;

// Notes / moderator / probe markers
const probeMarkers = ["probe", "probes", "supportive questions", "deep dive", "optional"]; // include EN terms
const noteMarkers = ["note for moderator", "moderator:", "hinweis für den moderator", "note:" ];

// Question candidates (multi-lingual starts)
const questionStartWords = [
  // EN
  "what", "how", "why", "which", "who", "when", "where", "can you", "would you", "tell me", "please",
  // DE
  "was", "wie", "warum", "welche", "welcher", "welches", "wann", "wo", "können sie", "würden sie", "teilen sie",
  // FR
  "quoi", "comment", "pourquoi", "lequel", "laquelle", "quand", "où", "pouvez-vous", "voudriez-vous",
  // ES
  "qué", "cómo", "por qué", "cuándo", "dónde", "puede", "podría",
  // RO
  "ce", "cum", "de ce", "când", "unde", "puteți", "ați putea",
];

function looksLikeQuestion(line: string): boolean {
  const l = line.trim();
  if (!l) return false;
  if (/\?$/.test(l)) return true;
  const low = l.toLowerCase();
  return questionStartWords.some(w => low.startsWith(w));
}

function looksLikeProbe(line: string): boolean {
  const low = line.trim().toLowerCase();
  return probeMarkers.some(m => low.includes(m));
}

function looksLikeNote(line: string): boolean {
  const low = line.trim().toLowerCase();
  return noteMarkers.some(m => low.includes(m));
}

/** ----------------------------- Rules Parser ----------------------------- */

type RulesParseResult = { guide: SimpleGuide; metrics: ParseMetrics; };

function rulesParse(text: string): RulesParseResult {
  const cleaned = cleanPastedText(text);
  const lines = cleaned.split(/\n+/);

  const guide: SimpleGuide = {
    version: "ContentAnalysisReady.v1",
    languageHints: detectLanguageHints(cleaned),
    sections: [],
    meta: { source: "rules" },
  };

  let currentSection: GuideSection | null = null;
  let currentSubsection: GuideSubsection | null = null;
  let qCounter = 0;
  const unparsed: string[] = [];
  let candidateQuestionLines = 0;
  let extractedQuestions = 0;

  function pushSection(sec: GuideSection) {
    guide.sections.push(sec);
    currentSection = sec; currentSubsection = null;
  }

  function ensureSectionExists() {
    if (!currentSection) {
      pushSection({ ref: "Section 0", title: "General", questions: [], subsections: [] });
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Try section match
    let matchedSection = false;
    for (const re of sectionRegexes) {
      const m = line.match(re);
      if (m) {
        const [, ref, title, tmin] = m;
        const timeMin = tmin ? parseInt(tmin) : (line.match(timeMinRegex)?.[1] ? parseInt(line.match(timeMinRegex)![1]) : null);
        pushSection({ ref: `Section ${ref}`, title: title?.trim() ?? `Section ${ref}`, timeMin: timeMin ?? null, questions: [], subsections: [] });
        matchedSection = true; break;
      }
    }
    if (matchedSection) continue;

    // Try subsection match
    const sm = line.match(subsectionRegex);
    if (sm) {
      ensureSectionExists();
      const ref = sm[1];
      const title = sm[2]?.replace(/[:\-]$/, '').trim();
      currentSubsection = { ref, title, timeMin: null, questions: [], notes: [] };
      currentSection!.subsections = currentSection!.subsections || [];
      currentSection!.subsections!.push(currentSubsection);
      continue;
    }

    // Notes / Moderator
    if (looksLikeNote(line)) {
      ensureSectionExists();
      const target = currentSubsection ?? currentSection!;
      target.notes = target.notes || [];
      target.notes.push(line);
      continue;
    }

    // Probes -> attach to last question
    if (looksLikeProbe(line)) {
      ensureSectionExists();
      const targetQs = (currentSubsection?.questions?.length ? currentSubsection!.questions : currentSection!.questions);
      if (targetQs.length > 0) {
        const lastQ = targetQs[targetQs.length - 1];
        lastQ.probes = lastQ.probes || [];
        lastQ.probes.push(line.replace(/^\s*(Supportive questions|Probe[s]?):\s*/i, '').trim());
      } else {
        // if no question yet, store as note
        const target = currentSubsection ?? currentSection!;
        target.notes = target.notes || [];
        target.notes.push(line);
      }
      continue;
    }

    // Questions
    if (looksLikeQuestion(line)) {
      candidateQuestionLines++;
      ensureSectionExists();
      const q: GuideQuestion = {
        id: `q_${++qCounter}`,
        text: line.replace(/^\d+\s+/, '').trim(),
        timeMin: null,
        subsection: currentSubsection?.title ?? null,
      };
      if (currentSubsection) currentSubsection.questions.push(q); else currentSection!.questions.push(q);
      extractedQuestions++;
      continue;
    }

    // If line looks like a heading without marker, treat as subsection heading (fallback)
    if (/^[A-ZÄÖÜÀÂÉÈÎÓÚÑÇ][^a-z]*[A-Za-z].{0,120}$/.test(line) && /[:)]$/.test(line) === false) {
      ensureSectionExists();
      currentSubsection = { ref: `${currentSection!.subsections?.length ? currentSection!.subsections!.length + 1 : 1}` , title: line, timeMin: null, questions: [], notes: [] };
      currentSection!.subsections = currentSection!.subsections || [];
      currentSection!.subsections!.push(currentSubsection);
      continue;
    }

    // Not captured: keep sample (limit 25)
    if (unparsed.length < 25) unparsed.push(line);
  }

  const metrics: ParseMetrics = {
    totalLines: lines.length,
    candidateQuestionLines,
    extractedQuestions,
    sections: guide.sections.length,
    subsections: guide.sections.reduce((a, s) => a + (s.subsections?.length ?? 0), 0),
    coverage: candidateQuestionLines > 0 ? extractedQuestions / candidateQuestionLines : 1,
    source: "rules",
    unparsedSamples: unparsed,
  };

  return { guide, metrics };
}

/** ----------------------------- Azure OpenAI Fallback ----------------------------- */

const AZURE_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT") || "";
const AZURE_KEY = Deno.env.get("AZURE_OPENAI_KEY") || "";
const AZURE_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "";
const AZURE_API_VERSION = "2024-05-01-preview";

const JSON_SCHEMA = {
  type: "object",
  properties: {
    version: { const: "ContentAnalysisReady.v1" },
    languageHints: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        required: ["ref", "title", "questions"],
        properties: {
          ref: { type: "string" },
          title: { type: "string" },
          timeMin: { type: ["number", "null"] },
          notes: { type: "array", items: { type: "string" } },
          questions: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "text"],
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                probes: { type: "array", items: { type: "string" } },
                mandatory: { type: "boolean" },
                tags: { type: "array", items: { type: "string" } },
                timeMin: { type: ["number", "null"] },
                subsection: { type: ["string", "null"] },
              },
              additionalProperties: false,
            },
          },
          subsections: {
            type: "array",
            items: {
              type: "object",
              required: ["ref", "title", "questions"],
              properties: {
                ref: { type: "string" },
                title: { type: "string" },
                timeMin: { type: ["number", "null"] },
                notes: { type: "array", items: { type: "string" } },
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["id", "text"],
                    properties: {
                      id: { type: "string" },
                      text: { type: "string" },
                      probes: { type: "array", items: { type: "string" } },
                      mandatory: { type: "boolean" },
                      tags: { type: "array", items: { type: "string" } },
                      timeMin: { type: ["number", "null"] },
                      subsection: { type: ["string", "null"] },
                    },
                    additionalProperties: false,
                  },
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
    meta: { type: "object" },
  },
  required: ["version", "languageHints", "sections"],
  additionalProperties: false,
} as const;

async function azureLLMParse(cleaned: string, hints: string[]): Promise<SimpleGuide> {
  if (!AZURE_ENDPOINT || !AZURE_KEY || !AZURE_DEPLOYMENT) {
    throw new Error("Azure OpenAI env vars missing");
  }

  // Chunk by big sections to avoid context overflow
  const chunks = splitBySections(cleaned);

  const partials: SimpleGuide[] = [];
  let qOffset = 0;

  for (const chunk of chunks) {
    const body = {
      messages: [
        { role: "system", content: "You are an expert at parsing market-research discussion guides. Output STRICT JSON ONLY that validates against the provided JSON schema. Do not add commentary." },
        { role: "user", content: [
          { type: "text", text: `LANGUAGE HINTS: ${hints.join(', ')}\n\nJSON SCHEMA (TypeScript semantics):\n${JSON.stringify(JSON_SCHEMA)}\n\nTASK: Extract all SECTIONS, SUBSECTIONS and QUESTIONS.\n- Preserve the original wording of questions.\n- Map probes/supportive questions under the parent question's 'probes'.\n- Include moderator notes under 'notes'.\n- Populate 'ref' for sections/subsections if present (e.g., 'Section 3', '3.1').\n- If IDs are missing, generate stable ids as 'q_${qOffset}++'.\n- Fill 'languageHints' with detected language codes.\n\nGUIDE TEXT:\n\n${chunk}\n\nReturn ONLY the JSON object.` },
        ] },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    } as any;

    const resp = await fetch(`${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`,
      { method: "POST", headers: { "Content-Type": "application/json", "api-key": AZURE_KEY }, body: JSON.stringify(body) });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Azure OpenAI error: ${resp.status} ${t}`);
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeJSON(content) as SimpleGuide;

    // Re-id questions to keep uniqueness across chunks
    reindexQuestionIds(parsed, qOffset);
    qOffset += countQuestions(parsed);

    partials.push(parsed);
  }

  return mergeGuides(partials, hints);
}

function safeJSON(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}

function splitBySections(text: string): string[] {
  // Split on big Section/Abschnitt/Sección headers, keep them
  const re = /(\n|^)\s*(Section\s+[A-Z\d]+\s*[:\-]|Abschnitt\s+[A-Z\d]+\s*[:\-]|Sección\s+[A-Z\d]+\s*[:\-])/gi;
  const parts: string[] = [];
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const idx = m.index;
    if (idx > last) parts.push(text.slice(last, idx));
    last = idx;
  }
  parts.push(text.slice(last));
  return parts.map(s => s.trim()).filter(Boolean);
}

function countQuestions(g: SimpleGuide): number {
  return g.sections.reduce((a, s) => a + s.questions.length + (s.subsections?.reduce((aa, ss) => aa + ss.questions.length, 0) ?? 0), 0);
}

function reindexQuestionIds(g: SimpleGuide, startAt: number) {
  let i = startAt;
  for (const s of g.sections) {
    for (const q of s.questions) q.id = `q_${i++}`;
    for (const ss of s.subsections ?? []) {
      for (const q of ss.questions) q.id = `q_${i++}`;
    }
  }
}

function mergeGuides(parts: SimpleGuide[], hints: string[]): SimpleGuide {
  const merged: SimpleGuide = { version: "ContentAnalysisReady.v1", languageHints: Array.from(new Set(parts.flatMap(p => p.languageHints).concat(hints))), sections: [] };
  for (const p of parts) merged.sections.push(...p.sections);
  return merged;
}

/** ----------------------------- Post-processing ----------------------------- */

function toAnalysisReady(guide: SimpleGuide) {
  // Flatten to the format expected by your worker
  const items: Array<{ question_type: 'structured'; question: string; section: string; subsection: string | null; respondents: Record<string, never> }>
    = [];
  for (const s of guide.sections) {
    for (const q of s.questions) {
      items.push({ question_type: 'structured', question: q.text, section: s.title, subsection: null, respondents: {} });
    }
    for (const ss of s.subsections ?? []) {
      for (const q of ss.questions) {
        items.push({ question_type: 'structured', question: q.text, section: s.title, subsection: ss.title, respondents: {} });
      }
    }
  }
  return items;
}

/** ----------------------------- Main Handler ----------------------------- */

serve(async (req) => {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    const { text } = await req.json();
    if (!text || typeof text !== "string") return Response.json({ error: "Provide { text: string }" }, { status: 400, headers: corsHeaders });

    const { guide: rulesGuide, metrics: rulesMetrics } = rulesParse(text);
    let guide = rulesGuide;
    let source: ParseMetrics["source"] = "rules";

    if (rulesMetrics.coverage < 0.9) {
      try {
        const aiGuide = await azureLLMParse(cleanPastedText(text), detectLanguageHints(text));
        guide = aiGuide;
        source = rulesMetrics.coverage > 0.3 ? "rules+ai" : "ai";
      } catch (e) {
        // keep rules result on AI error
        console.warn("AI fallback failed:", e);
      }
    }

    const analysis_ready = toAnalysisReady(guide);

    const metrics: ParseMetrics = {
      ...rulesMetrics,
      extractedQuestions: analysis_ready.length,
      coverage: rulesMetrics.candidateQuestionLines > 0 ? Math.min(1, analysis_ready.length / rulesMetrics.candidateQuestionLines) : 1,
      source,
    };

    return Response.json({ guide, metrics, analysis_ready }, { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});



 