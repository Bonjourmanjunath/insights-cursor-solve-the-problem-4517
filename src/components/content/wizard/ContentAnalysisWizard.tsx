import React, { useState } from 'react';
import { Guide } from '../../../lib/GuideSchema';
import { supabase } from '../../../integrations/supabase/client';
import Step1_Welcome from './Step1_Welcome';
import Step2_BuildGuide from './Step2_BuildGuide';
import Step3_Review from './Step3_Review';
import Step4_Run from './Step4_Run';

interface ContentAnalysisWizardProps {
  projectId: string;
  onComplete: (guide: Guide) => void;
  onCancel: () => void;
  startAtStep?: number;
}

export default function ContentAnalysisWizard({ projectId, onComplete, onCancel, startAtStep = 1 }: ContentAnalysisWizardProps) {
  const [currentStep, setCurrentStep] = useState(startAtStep);
  const [guide, setGuide] = useState<Guide>({ sections: [] });

  // Load existing guide if starting at step 4
  React.useEffect(() => {
    if (startAtStep === 4) {
      // Load the existing guide from the project
      const loadExistingGuide = async () => {
        try {
          const { data: project } = await supabase
            .from('research_projects')
            .select('guide_context')
            .eq('id', projectId)
            .single();
          
          if (project?.guide_context) {
            const parsedGuide = JSON.parse(project.guide_context);
            setGuide(parsedGuide);
          }
        } catch (error) {
          console.error('Error loading existing guide:', error);
        }
      };
      
      loadExistingGuide();
    }
  }, [startAtStep, projectId]);

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleGuideUpdate = (updatedGuide: Guide) => {
    console.log('handleGuideUpdate called with:', updatedGuide);
    setGuide(updatedGuide);
  };

  const handleComplete = () => {
    onComplete(guide);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_Welcome 
            onNext={handleNext}
            onCancel={onCancel}
          />
        );
      case 2:
        return (
          <Step2_BuildGuide 
            guide={guide}
            onGuideUpdate={handleGuideUpdate}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3_Review 
            guide={guide}
            onBack={handleBack}
            onConfirm={handleNext}
            onEdit={() => setCurrentStep(2)}
          />
        );
      case 4:
        return (
          <Step4_Run 
            projectId={projectId}
            guide={guide}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stepper Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`
                      w-16 h-0.5 mx-4
                      ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              Step {currentStep} of 4
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {renderStep()}
      </div>
    </div>
  );
} 