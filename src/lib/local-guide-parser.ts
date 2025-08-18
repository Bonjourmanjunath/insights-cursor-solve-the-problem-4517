/**
 * Local Guide Parser - Works without external dependencies!
 * This is like having a Swiss Army knife for parsing guides - simple but effective!
 */

export interface ParsedSection {
  id: string;
  title: string;
  questions: string[];
  subsections?: ParsedSubsection[];
}

export interface ParsedSubsection {
  id: string;
  title: string;
  questions: string[];
}

export class LocalGuideParser {
  /**
   * Parse a discussion guide text into structured sections
   * This is like teaching a robot to read an outline - we look for patterns!
   */
  static parseGuide(guideText: string): ParsedSection[] {
    const lines = guideText.split('\n').map(line => line.trim()).filter(line => line);
    const sections: ParsedSection[] = [];
    
    let currentSection: ParsedSection | null = null;
    let currentSubsection: ParsedSubsection | null = null;
    let sectionCounter = 0;
    let subsectionCounter = 0;
    
    for (const line of lines) {
      // Check if this is a section header (usually has numbers or letters at the start)
      if (this.isSectionHeader(line)) {
        // Save previous subsection if exists
        if (currentSubsection && currentSection) {
          if (!currentSection.subsections) currentSection.subsections = [];
          currentSection.subsections.push(currentSubsection);
          currentSubsection = null;
        }
        
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Create new section
        sectionCounter++;
        currentSection = {
          id: `section_${sectionCounter}`,
          title: line,
          questions: [],
          subsections: []
        };
      }
      // Check if this is a subsection header
      else if (this.isSubsectionHeader(line)) {
        // Save previous subsection if exists
        if (currentSubsection && currentSection) {
          if (!currentSection.subsections) currentSection.subsections = [];
          currentSection.subsections.push(currentSubsection);
        }
        
        // Create new subsection
        subsectionCounter++;
        currentSubsection = {
          id: `subsection_${sectionCounter}_${subsectionCounter}`,
          title: line,
          questions: []
        };
      }
      // Check if this is a question
      else if (this.isQuestion(line)) {
        if (currentSubsection) {
          currentSubsection.questions.push(line);
        } else if (currentSection) {
          currentSection.questions.push(line);
        }
      }
      // Regular text that might be part of a question
      else if (line && (currentSection || currentSubsection)) {
        // Add to the most recent question if it looks like a continuation
        if (currentSubsection && currentSubsection.questions.length > 0) {
          const lastIndex = currentSubsection.questions.length - 1;
          currentSubsection.questions[lastIndex] += ' ' + line;
        } else if (currentSection && !currentSubsection && currentSection.questions.length > 0) {
          const lastIndex = currentSection.questions.length - 1;
          currentSection.questions[lastIndex] += ' ' + line;
        }
      }
    }
    
    // Don't forget the last items!
    if (currentSubsection && currentSection) {
      if (!currentSection.subsections) currentSection.subsections = [];
      currentSection.subsections.push(currentSubsection);
    }
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }
  
  /**
   * Check if a line looks like a section header
   * Looking for patterns like "1.", "A.", "Section 1", etc.
   */
  private static isSectionHeader(line: string): boolean {
    // Patterns that indicate section headers
    const patterns = [
      /^[A-Z]\.\s+/,              // A. Section
      /^[0-9]+\.\s+/,             // 1. Section
      /^Section\s+[0-9]+/i,       // Section 1
      /^Part\s+[A-Z0-9]+/i,       // Part A
      /^Chapter\s+[0-9]+/i,       // Chapter 1
      /^[IVX]+\.\s+/,             // Roman numerals
    ];
    
    return patterns.some(pattern => pattern.test(line)) && line.length > 3;
  }
  
  /**
   * Check if a line looks like a subsection header
   * Looking for patterns like "1.1", "(a)", etc.
   */
  private static isSubsectionHeader(line: string): boolean {
    const patterns = [
      /^[0-9]+\.[0-9]+/,          // 1.1 Subsection
      /^\([a-z]\)/i,              // (a) Subsection
      /^[a-z]\)\s+/i,             // a) Subsection
      /^-\s*[A-Z]/,               // - Subsection (dash followed by capital)
      /^•\s*[A-Z]/,               // • Subsection (bullet followed by capital)
    ];
    
    return patterns.some(pattern => pattern.test(line)) && line.length > 2;
  }
  
  /**
   * Check if a line looks like a question
   * Questions usually end with "?" or start with question words
   */
  private static isQuestion(line: string): boolean {
    // Direct question (ends with ?)
    if (line.endsWith('?')) return true;
    
    // Starts with question words
    const questionWords = ['how', 'what', 'when', 'where', 'why', 'who', 'which', 'would', 'could', 'should', 'do', 'does', 'is', 'are', 'can'];
    const firstWord = line.split(' ')[0].toLowerCase();
    
    return questionWords.includes(firstWord);
  }
  
  /**
   * Format the parsed guide into a readable string
   * This is like pretty-printing for humans!
   */
  static formatParsedGuide(sections: ParsedSection[]): string {
    let output = '';
    
    sections.forEach((section, sIndex) => {
      output += `\n${sIndex + 1}. ${section.title}\n`;
      output += '=' .repeat(50) + '\n';
      
      // Direct questions under section
      if (section.questions.length > 0) {
        section.questions.forEach((q, qIndex) => {
          output += `   Q${qIndex + 1}: ${q}\n`;
        });
      }
      
      // Subsections
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach((subsection, subIndex) => {
          output += `\n   ${sIndex + 1}.${subIndex + 1} ${subsection.title}\n`;
          output += '   ' + '-'.repeat(40) + '\n';
          
          subsection.questions.forEach((q, qIndex) => {
            output += `      Q${qIndex + 1}: ${q}\n`;
          });
        });
      }
    });
    
    return output;
  }
}