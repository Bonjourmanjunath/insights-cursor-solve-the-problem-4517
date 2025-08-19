import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { Guide, GuideZ } from '../lib/GuideSchema';
import { saveGuide } from '../lib/guide-utils';
import ContentAnalysisWizardComponent from '../components/content/wizard/ContentAnalysisWizard';
import ContentAnalysis from './ContentAnalysis';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { ArrowLeft, Edit, Play } from 'lucide-react';

export default function ContentAnalysisWizardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const loadProject = React.useCallback(async () => {
    try {
      console.log('Loading project with ID:', projectId);
      console.log('User ID:', user?.id);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('research_projects')
        .select('id, name, guide_context, user_id')
        .eq('id', projectId)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        console.error('Project not found or access denied');
        throw new Error('Project not found or access denied');
      }

      console.log('Project data:', data);
      setProject(data);

      // Try to parse existing guide
      if (data.guide_context) {
        try {
          // First try to parse as JSON (new structured format)
          const parsedGuide = JSON.parse(data.guide_context);
          const validatedGuide = GuideZ.parse(parsedGuide);
          setGuide(validatedGuide);
          console.log('Structured guide loaded successfully');
        } catch (parseError) {
          console.log('Not a structured guide, checking if it\'s text format...');
          
          // If JSON parsing fails, check if it's a text guide (old format)
          if (typeof data.guide_context === 'string' && data.guide_context.trim().length > 0) {
            console.log('Found text-based guide, showing as ready for analysis');
            // For text guides, create a simple guide object to show the UI
            setGuide({
              sections: [{
                id: 'text-guide',
                number: '1',
                title: 'Text-based Discussion Guide',
                questions: [],
                general_questions: [],
                subsections: []
              }]
            });
            setShowWizard(false);
          } else {
            console.log('No valid guide found, will show wizard');
          }
        }
      } else {
        console.log('No guide_context found');
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [projectId, user?.id]);

  useEffect(() => {
    if (projectId && user) {
      loadProject();
    }
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timeout);
  }, [loadProject]);

  const handleGuideComplete = async (newGuide: Guide) => {
    try {
      console.log('Saving guide to database...', { projectId, userId: user?.id });
      console.log('Guide to save:', newGuide);
      
      // Use the new saveGuide function
      const savedGuide = await saveGuide(projectId!, newGuide);
      
      console.log('Guide saved and verified successfully!');
      setGuide(savedGuide);
      setShowWizard(false);
      
    } catch (error) {
      console.error('Error saving guide:', error);
      // Show error to user
      alert(`Failed to save guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAnalysisComplete = () => {
    // When analysis is complete, just close the wizard
    setShowWizard(false);
    // Optionally refresh the page or show results
    window.location.reload();
  };

  const handleEditGuide = () => {
    setShowWizard(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          <p className="text-sm text-gray-500 mb-4">Project ID: {projectId}</p>
          <p className="text-sm text-gray-500 mb-4">User ID: {user?.id}</p>
          <Button onClick={() => navigate('/dashboard/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Show wizard if no guide exists or if user wants to run analysis
  if (!guide || showWizard) {
    return (
      <ContentAnalysisWizardComponent
        projectId={projectId!}
        onComplete={guide && showWizard ? handleAnalysisComplete : handleGuideComplete}
        onCancel={() => navigate('/dashboard/projects')}
        startAtStep={guide && showWizard ? 4 : 1}
      />
    );
  }

  // Show analysis results with edit option
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/projects')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Projects</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-600">Content Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Edit Guide</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[600px] sm:w-[800px]">
                  <SheetHeader>
                    <SheetTitle>Edit Discussion Guide</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <ContentAnalysisWizardComponent
                      projectId={projectId!}
                      onComplete={handleGuideComplete}
                      onCancel={() => setShowWizard(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Summary */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-green-600" />
              <span>Guide Ready ✓</span>
            </CardTitle>
            <CardDescription>
              {guide.sections[0]?.id === 'text-guide' 
                ? 'Your text-based discussion guide is ready for analysis'
                : 'Your discussion guide is structured and ready for analysis'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {guide.sections[0]?.id === 'text-guide' ? '1' : guide.sections.length}
                </div>
                <div className="text-sm text-gray-600">Sections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {guide.sections[0]?.id === 'text-guide' ? '0' : guide.sections.reduce((total, section) => total + section.subsections.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Subsections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {guide.sections[0]?.id === 'text-guide' ? '0' : guide.sections.reduce((total, section) => 
                    total + section.subsections.reduce((subTotal, subsection) => 
                      subTotal + subsection.subsubsections.length, 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Sub-subsections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {guide.sections[0]?.id === 'text-guide' ? '1' : guide.sections.reduce((total, section) => {
                    let count = section.questions.length + section.general_questions.length;
                    section.subsections.forEach(subsection => {
                      count += subsection.questions.length + subsection.general_questions.length;
                      subsection.subsubsections.forEach(subSubsection => {
                        count += subSubsection.questions.length + subSubsection.general_questions.length;
                      });
                    });
                    return total + count;
                  }, 0)}
                </div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run Analysis Button */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Run Analysis</CardTitle>
            <CardDescription>
              Your structured guide is ready. Click below to run content analysis using your new guide structure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">What will happen:</h4>
                <ul className="text-blue-700 space-y-1 text-sm">
                  <li>• Your structured guide will be used to analyze transcripts</li>
                  <li>• Each question from your guide will get its own row in the matrix</li>
                  <li>• Results will be organized by your guide structure</li>
                  <li>• You'll get QUOTE, SUMMARY, and THEME for each question</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => {
                  // Navigate to the run analysis step
                  setShowWizard(true);
                }}
                size="lg"
                className="w-full"
              >
                <Play className="w-5 h-5 mr-2" />
                Run Content Analysis with New Guide
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 