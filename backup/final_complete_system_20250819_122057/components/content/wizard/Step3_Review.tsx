import React from 'react';
import { Guide } from '../../../lib/GuideSchema';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface Step3_ReviewProps {
  guide: Guide;
  onBack: () => void;
  onConfirm: () => void;
  onEdit: () => void;
}

export default function Step3_Review({ guide, onBack, onConfirm, onEdit }: Step3_ReviewProps) {
  const totalQuestions = guide.sections.reduce((total, section) => {
    let count = section.questions.length + section.general_questions.length;
    section.subsections.forEach(subsection => {
      count += subsection.questions.length + subsection.general_questions.length;
      subsection.subsubsections.forEach(subSubsection => {
        count += subSubsection.questions.length + subSubsection.general_questions.length;
      });
    });
    return total + count;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Guide</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-6">
          Confirm your structure below. You can expand each level to verify every question.
        </p>
        
        {/* Guide Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-green-800 mb-2">Guide Summary:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Sections:</span> {guide.sections.length}
            </div>
            <div>
              <span className="font-medium">Subsections:</span> {guide.sections.reduce((total, section) => total + section.subsections.length, 0)}
            </div>
            <div>
              <span className="font-medium">Sub-subsections:</span> {guide.sections.reduce((total, section) => 
                total + section.subsections.reduce((subTotal, subsection) => 
                  subTotal + subsection.subsubsections.length, 0), 0)}
            </div>
            <div>
              <span className="font-medium">Questions:</span> {totalQuestions}
            </div>
          </div>
        </div>

        {/* Guide Structure */}
        <div className="border rounded-lg p-4 mb-6">
          <h4 className="font-semibold mb-3">Guide Structure:</h4>
          <div className="space-y-2">
            {guide.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="ml-4">
                <div className="font-medium text-blue-600">
                  Section {section.number}: {section.title}
                </div>
                {section.questions.length > 0 && (
                  <div className="ml-4 text-sm text-gray-600">
                    Questions: {section.questions.length}
                  </div>
                )}
                {section.subsections.map((subsection, subsectionIndex) => (
                  <div key={subsectionIndex} className="ml-4 mt-1">
                    <div className="font-medium text-green-600">
                      {subsection.number}: {subsection.title}
                    </div>
                    {subsection.questions.length > 0 && (
                      <div className="ml-4 text-sm text-gray-600">
                        Questions: {subsection.questions.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button onClick={onConfirm}>
              Confirm & Save Guide
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 