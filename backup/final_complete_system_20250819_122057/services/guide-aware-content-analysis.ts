import { supabase } from "@/integrations/supabase/client";

export interface DiscussionGuideSection {
  id: string;
  title: string;
  subsections?: DiscussionGuideSubsection[];
}

export interface DiscussionGuideSubsection {
  id: string;
  title: string;
  questions: string[];
}

export interface GuideAwareAnalysisRequest {
  projectId: string;
  discussionGuide: string;
  transcriptFiles: File[];
}

export interface GuideAwareAnalysisResult {
  sections: DiscussionGuideSection[];
  analysis: {
    [sectionId: string]: {
      [subsectionId: string]: {
        [questionIndex: number]: {
          [respondentId: string]: {
            quote: string;
            summary: string;
            theme: string;
            profile?: {
              role: string;
              geography: string;
              specialty: string;
              experience: string;
            };
          };
        };
      };
    };
  };
}

export class GuideAwareContentAnalysisService {
  static async analyze(
    request: GuideAwareAnalysisRequest
  ): Promise<GuideAwareAnalysisResult> {
    try {
      // Step 1: Parse the discussion guide structure
      const sections = await this.parseDiscussionGuide(request.discussionGuide);
      
      // Step 2: Process transcripts and map to guide sections
      const analysis = await this.processTranscripts(
        request.transcriptFiles,
        sections
      );

      return {
        sections,
        analysis,
      };
    } catch (error) {
      console.error("Guide-aware analysis failed:", error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async parseDiscussionGuide(guideText: string): Promise<DiscussionGuideSection[]> {
    const { data, error } = await supabase.functions.invoke("guide-aware-worker", {
      body: {
        action: "parse_guide",
        guideText,
      },
    });

    if (error) throw error;
    if (!data?.sections) throw new Error("Failed to parse discussion guide");

    return data.sections;
  }

  private static async processTranscripts(
    transcriptFiles: File[],
    sections: DiscussionGuideSection[]
  ) {
    const analysis: GuideAwareAnalysisResult['analysis'] = {};

    // Process each transcript file
    for (let fileIndex = 0; fileIndex < transcriptFiles.length; fileIndex++) {
      const file = transcriptFiles[fileIndex];
      const respondentId = `Respondent-0${fileIndex + 1}`;
      
      const transcriptText = await file.text();
      
      // Analyze this transcript against all guide sections
      const { data, error } = await supabase.functions.invoke("guide-aware-worker", {
        body: {
          action: "analyze_transcript",
          transcriptText,
          sections,
          respondentId,
        },
      });

      if (error) {
        console.error(`Failed to analyze transcript ${file.name}:`, error);
        continue;
      }

      // Merge the analysis results
      this.mergeAnalysisResults(analysis, data.analysis);
    }

    return analysis;
  }

  private static mergeAnalysisResults(
    target: GuideAwareAnalysisResult['analysis'],
    source: any
  ) {
    for (const sectionId in source) {
      if (!target[sectionId]) target[sectionId] = {};
      
      for (const subsectionId in source[sectionId]) {
        if (!target[sectionId][subsectionId]) target[sectionId][subsectionId] = {};
        
        for (const questionIndex in source[sectionId][subsectionId]) {
          if (!target[sectionId][subsectionId][questionIndex]) {
            target[sectionId][subsectionId][questionIndex] = {};
          }
          
          Object.assign(
            target[sectionId][subsectionId][questionIndex],
            source[sectionId][subsectionId][questionIndex]
          );
        }
      }
    }
  }

  static async validateDiscussionGuide(guideText: string): Promise<{
    isValid: boolean;
    errors: string[];
    sections: DiscussionGuideSection[];
  }> {
    try {
      const sections = await this.parseDiscussionGuide(guideText);
      return {
        isValid: true,
        errors: [],
        sections,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Failed to parse guide'],
        sections: [],
      };
    }
  }
} 