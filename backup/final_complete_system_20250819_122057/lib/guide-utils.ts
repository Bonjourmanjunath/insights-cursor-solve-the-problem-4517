import { GuideZ, type Guide, type Section, type Subsection, type SubSubsection, type Question } from './GuideSchema';
import { supabase } from '../integrations/supabase/client';

export const generateId = (): string => crypto.randomUUID();

export const createQuestion = (text: string): Question => ({
  id: generateId(),
  text: text.trim()
});

export const createSection = (number: string, title: string): Section => ({
  id: generateId(),
  number,
  title,
  questions: [],
  general_questions: [],
  subsections: []
});

export const createSubsection = (number: string, title: string): Subsection => ({
  id: generateId(),
  number,
  title,
  questions: [],
  general_questions: [],
  subsubsections: []
});

export const createSubSubsection = (number: string, title: string): SubSubsection => ({
  id: generateId(),
  number,
  title,
  questions: [],
  general_questions: []
});

// Validation helpers
export const isNumberUnique = (number: string, siblings: Array<{ number: string }>): boolean => {
  return !siblings.some(sibling => sibling.number === number);
};

export const getNextSectionNumber = (sections: Section[]): string => {
  const numbers = sections.map(s => parseInt(s.number)).filter(n => !isNaN(n));
  return numbers.length > 0 ? Math.max(...numbers) + 1 + '' : '1';
};

export const getNextSubsectionNumber = (subsections: Subsection[], parentNumber: string): string => {
  const numbers = subsections
    .map(s => s.number.replace(`${parentNumber}.`, ''))
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));
  return numbers.length > 0 ? `${parentNumber}.${Math.max(...numbers) + 1}` : `${parentNumber}.1`;
};

export const getNextSubSubsectionNumber = (subSubsections: SubSubsection[], parentNumber: string): string => {
  const numbers = subSubsections
    .map(s => s.number.replace(`${parentNumber}.`, ''))
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));
  return numbers.length > 0 ? `${parentNumber}.${Math.max(...numbers) + 1}` : `${parentNumber}.1`;
};

// Reorder helpers
export const reorderArray = <T>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

// Count helpers
export const countQuestions = (guide: Guide): number => {
  let count = 0;
  
  guide.sections.forEach(section => {
    count += section.questions.length;
    count += section.general_questions.length;
    
    section.subsections.forEach(subsection => {
      count += subsection.questions.length;
      count += subsection.general_questions.length;
      
      subsection.subsubsections.forEach(subSubsection => {
        count += subSubsection.questions.length;
        count += subSubsection.general_questions.length;
      });
    });
  });
  
  return count;
};

export const countSections = (guide: Guide): number => guide.sections.length;

export const countSubsections = (guide: Guide): number => {
  return guide.sections.reduce((total, section) => {
    return total + section.subsections.length;
  }, 0);
};

export const countSubSubsections = (guide: Guide): number => {
  return guide.sections.reduce((total, section) => {
    return total + section.subsections.reduce((subTotal, subsection) => {
      return subTotal + subsection.subsubsections.length;
    }, 0);
  }, 0);
}; 

// Function to automatically check project access
async function ensureProjectAccess(projectId: string): Promise<void> {
  try {
    // First, try to get the current user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) throw new Error('Not authenticated');
    const userId = authData.user.id;

    // Check if the project exists and user has access
    const { data: project, error: projectErr } = await supabase
      .from('research_projects')
      .select('id, user_id')
      .eq('id', projectId)
      .maybeSingle();

    if (projectErr) throw new Error(`Project lookup failed: ${projectErr.message}`);
    if (!project) throw new Error('Project not found');
    if (project.user_id !== userId) {
      throw new Error('You do not have permission to update this project.');
    }

    console.log('Project access verified for user:', userId);
  } catch (error) {
    console.warn('Error ensuring project access:', error);
    // Don't throw - let the main save function handle errors
  }
}

export async function saveGuide(projectId: string, draft: unknown): Promise<Guide> {
  const guide = GuideZ.parse(draft); // validate before saving

  // Check project access before saving
  await ensureProjectAccess(projectId);

  // Get current user for RLS-aligned filters
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) throw new Error('Not authenticated');
  const userId = authData.user.id;

  // Try to save the guide with user_id filter
  const { data, error } = await supabase
    .from("research_projects")
    .update({ guide_context: JSON.stringify(guide) })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select("id, guide_context")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to save guide: ${error.message}. Please contact support or try refreshing the page.`);
  }

  if (!data) {
    throw new Error('Failed to save guide: No data returned. Please contact support or try refreshing the page.');
  }

  const savedGuide = typeof data.guide_context === 'string' 
    ? JSON.parse(data.guide_context) 
    : data.guide_context;

  if (!savedGuide?.sections?.length) {
    throw new Error("Save verification failed: guide_context empty.");
  }

  return savedGuide;
} 