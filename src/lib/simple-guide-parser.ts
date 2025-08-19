import { supabase } from '../integrations/supabase/client';

export interface SimpleGuide {
  sections: {
    title: string;
    questions: string[];
  }[];
}

export interface ParseMetrics {
  coverage: number;
  rawQL: number;
  jsonQ: number;
  sections: number;
  totalQuestions: number;
}

export async function parseGuideFromText(text: string): Promise<{ guide: SimpleGuide; metrics: ParseMetrics }> {
  try {
    console.log('Starting simple guide parsing...');
    console.log('Text length:', text.length);
    console.log('Text preview:', text.substring(0, 100) + '...');
    
    // Count raw questions in text
    const rawQL = countQuestionLike(text);
    console.log(`Found ${rawQL} raw questions in text`);

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    console.log('User session:', session ? 'LOGGED IN' : 'NOT LOGGED IN');

    // Call the hardened edge function
    console.log('Calling guide-parser edge function...');
    const { data, error } = await supabase.functions.invoke('guide-parser', {
      body: { text }
    });

    console.log('Edge function response:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);            // network/error from Supabase
    }
    if (!data?.ok) {
      console.error('Function error:', data?.error);
      throw new Error(data?.error || "Parser failed");  // function error
    }

    // Convert the complex guide structure to simple format
    const complexGuide = data.guide;
    console.log('Complex guide received:', complexGuide);
    
    const simpleGuide: SimpleGuide = {
      sections: complexGuide.sections.map((section: any) => ({
        title: section.title,
        questions: [
          ...(section.questions || []).map((q: any) => q.text),
          ...(section.general_questions || []).map((q: any) => q.text),
          ...(section.subsections || []).flatMap((sub: any) => [
            ...(sub.questions || []).map((q: any) => q.text),
            ...(sub.general_questions || []).map((q: any) => q.text),
            ...(sub.subsubsections || []).flatMap((subsub: any) => [
              ...(subsub.questions || []).map((q: any) => q.text),
              ...(subsub.general_questions || []).map((q: any) => q.text)
            ])
          ])
        ]
      }))
    };

    // Calculate metrics
    const jsonQ = simpleGuide.sections.reduce((total, section) => 
      total + section.questions.length, 0
    );
    
    const coverage = rawQL > 0 ? Math.min(1, jsonQ / rawQL) : 1;
    
    const metrics: ParseMetrics = {
      coverage,
      rawQL,
      jsonQ,
      sections: simpleGuide.sections.length,
      totalQuestions: jsonQ
    };

    console.log(`Parsing completed: ${jsonQ} questions across ${simpleGuide.sections.length} sections`);
    console.log(`Coverage: ${(coverage * 100).toFixed(1)}%`);

    return { guide: simpleGuide, metrics };
  } catch (error) {
    console.error('Error parsing guide:', error);
    throw new Error(`Failed to parse discussion guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

export function guideToAnalysisFormat(guide: SimpleGuide) {
  const questions = [];
  
  for (const section of guide.sections) {
    for (const question of section.questions) {
      questions.push({
        question_type: 'structured',
        question: question,
        section: section.title,
        subsection: null,
        respondents: {}
      });
    }
  }
  
  return questions;
} 