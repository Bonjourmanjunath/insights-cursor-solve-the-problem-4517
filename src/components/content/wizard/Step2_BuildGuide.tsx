import React, { useState } from 'react';
import { Guide, Section, Subsection, SubSubsection, Question } from '../../../lib/GuideSchema';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { 
  createSection, 
  createSubsection, 
  createSubSubsection, 
  createQuestion,
  getNextSectionNumber,
  getNextSubsectionNumber,
  getNextSubSubsectionNumber,
  reorderArray
} from '../../../lib/guide-utils';

interface Step2_BuildGuideProps {
  guide: Guide;
  onGuideUpdate: (guide: Guide) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2_BuildGuide({ guide, onGuideUpdate, onNext, onBack }: Step2_BuildGuideProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());
  const [showQuickStart, setShowQuickStart] = useState(true);

  const toggleSection = (sectionNumber: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionNumber)) {
      newExpanded.delete(sectionNumber);
    } else {
      newExpanded.add(sectionNumber);
    }
    setExpandedSections(newExpanded);
  };

  const toggleSubsection = (subsectionKey: string) => {
    const newExpanded = new Set(expandedSubsections);
    if (newExpanded.has(subsectionKey)) {
      newExpanded.delete(subsectionKey);
    } else {
      newExpanded.add(subsectionKey);
    }
    setExpandedSubsections(newExpanded);
  };

  const addSection = () => {
    const newSection = createSection(getNextSectionNumber(guide.sections), "New Section");
    const updatedGuide = { ...guide, sections: [...guide.sections, newSection] };
    onGuideUpdate(updatedGuide);
    setExpandedSections(new Set([...expandedSections, newSection.number]));
  };

  const addSubsection = (sectionIndex: number) => {
    const section = guide.sections[sectionIndex];
    const newSubsection = createSubsection(
      getNextSubsectionNumber(section.subsections, section.number),
      "New Subsection"
    );
    const updatedSections = [...guide.sections];
    updatedSections[sectionIndex] = {
      ...section,
      subsections: [...section.subsections, newSubsection]
    };
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
    setExpandedSubsections(new Set([...expandedSubsections, newSubsection.number]));
  };

  const addSubSubsection = (sectionIndex: number, subsectionIndex: number) => {
    const section = guide.sections[sectionIndex];
    const subsection = section.subsections[subsectionIndex];
    const newSubSubsection = createSubSubsection(
      getNextSubSubsectionNumber(subsection.subsubsections, subsection.number),
      "New Sub-subsection"
    );
    const updatedSubsections = [...section.subsections];
    updatedSubsections[subsectionIndex] = {
      ...subsection,
      subsubsections: [...subsection.subsubsections, newSubSubsection]
    };
    const updatedSections = [...guide.sections];
    updatedSections[sectionIndex] = {
      ...section,
      subsections: updatedSubsections
    };
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

  const addQuestion = (sectionIndex: number, subsectionIndex?: number, subSubsectionIndex?: number) => {
    const newQuestion = createQuestion("New question?");
    const updatedSections = [...guide.sections];
    
    if (subsectionIndex !== undefined && subSubsectionIndex !== undefined) {
      // Add to sub-subsection
      const section = updatedSections[sectionIndex];
      const subsection = section.subsections[subsectionIndex];
      const updatedSubSubsections = [...subsection.subsubsections];
      updatedSubSubsections[subSubsectionIndex] = {
        ...updatedSubSubsections[subSubsectionIndex],
        questions: [...updatedSubSubsections[subSubsectionIndex].questions, newQuestion]
      };
      const updatedSubsections = [...section.subsections];
      updatedSubsections[subsectionIndex] = {
        ...subsection,
        subsubsections: updatedSubSubsections
      };
      updatedSections[sectionIndex] = { ...section, subsections: updatedSubsections };
    } else if (subsectionIndex !== undefined) {
      // Add to subsection
      const section = updatedSections[sectionIndex];
      const updatedSubsections = [...section.subsections];
      updatedSubsections[subsectionIndex] = {
        ...updatedSubsections[subsectionIndex],
        questions: [...updatedSubsections[subsectionIndex].questions, newQuestion]
      };
      updatedSections[sectionIndex] = { ...section, subsections: updatedSubsections };
    } else {
      // Add to section
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        questions: [...updatedSections[sectionIndex].questions, newQuestion]
      };
    }
    
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

  const updateSection = (sectionIndex: number, field: keyof Section, value: any) => {
    const updatedSections = [...guide.sections];
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], [field]: value };
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

  const updateSubsection = (sectionIndex: number, subsectionIndex: number, field: keyof Subsection, value: any) => {
    const updatedSections = [...guide.sections];
    const updatedSubsections = [...updatedSections[sectionIndex].subsections];
    updatedSubsections[subsectionIndex] = { ...updatedSubsections[subsectionIndex], [field]: value };
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], subsections: updatedSubsections };
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

  const updateQuestion = (sectionIndex: number, questionIndex: number, text: string, subsectionIndex?: number, subSubsectionIndex?: number) => {
    const updatedSections = [...guide.sections];
    
    if (subsectionIndex !== undefined && subSubsectionIndex !== undefined) {
      const section = updatedSections[sectionIndex];
      const subsection = section.subsections[subsectionIndex];
      const updatedSubSubsections = [...subsection.subsubsections];
      const updatedQuestions = [...updatedSubSubsections[subSubsectionIndex].questions];
      updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], text };
      updatedSubSubsections[subSubsectionIndex] = {
        ...updatedSubSubsections[subSubsectionIndex],
        questions: updatedQuestions
      };
      const updatedSubsections = [...section.subsections];
      updatedSubsections[subsectionIndex] = { ...subsection, subsubsections: updatedSubSubSubsections };
      updatedSections[sectionIndex] = { ...section, subsections: updatedSubsections };
    } else if (subsectionIndex !== undefined) {
      const section = updatedSections[sectionIndex];
      const updatedSubsections = [...section.subsections];
      const updatedQuestions = [...updatedSubsections[subsectionIndex].questions];
      updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], text };
      updatedSubsections[subsectionIndex] = {
        ...updatedSubsections[subsectionIndex],
        questions: updatedQuestions
      };
      updatedSections[sectionIndex] = { ...section, subsections: updatedSubsections };
    } else {
      const updatedQuestions = [...updatedSections[sectionIndex].questions];
      updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], text };
      updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], questions: updatedQuestions };
    }
    
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

  const deleteSection = (sectionIndex: number) => {
    const updatedSections = guide.sections.filter((_, index) => index !== sectionIndex);
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

  const deleteSubsection = (sectionIndex: number, subsectionIndex: number) => {
    const updatedSections = [...guide.sections];
    const updatedSubsections = updatedSections[sectionIndex].subsections.filter((_, index) => index !== subsectionIndex);
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], subsections: updatedSubsections };
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

  const deleteQuestion = (sectionIndex: number, questionIndex: number, subsectionIndex?: number, subSubsectionIndex?: number) => {
    const updatedSections = [...guide.sections];
    
    if (subsectionIndex !== undefined && subSubsectionIndex !== undefined) {
      const section = updatedSections[sectionIndex];
      const subsection = section.subsections[subsectionIndex];
      const updatedSubSubsections = [...subsection.subsubsections];
      const updatedQuestions = updatedSubSubsections[subSubsectionIndex].questions.filter((_, index) => index !== questionIndex);
      updatedSubSubsections[subSubsectionIndex] = {
        ...updatedSubSubsections[subSubsectionIndex],
        questions: updatedQuestions
      };
      const updatedSubsections = [...section.subsections];
      updatedSubsections[subsectionIndex] = { ...subsection, subsubsections: updatedSubSubSubsections };
      updatedSections[sectionIndex] = { ...section, subsections: updatedSubsections };
    } else if (subsectionIndex !== undefined) {
      const section = updatedSections[sectionIndex];
      const updatedSubsections = [...section.subsections];
      const updatedQuestions = updatedSubsections[subsectionIndex].questions.filter((_, index) => index !== questionIndex);
      updatedSubsections[subsectionIndex] = {
        ...updatedSubsections[subsectionIndex],
        questions: updatedQuestions
      };
      updatedSections[sectionIndex] = { ...section, subsections: updatedSubsections };
    } else {
      const updatedQuestions = updatedSections[sectionIndex].questions.filter((_, index) => index !== questionIndex);
      updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], questions: updatedQuestions };
    }
    
    const updatedGuide = { ...guide, sections: updatedSections };
    onGuideUpdate(updatedGuide);
  };

    return (
    <Card>
      <CardHeader>
        <CardTitle>Build Your Discussion Guide</CardTitle>
      </CardHeader>
      <CardContent>
        {showQuickStart && guide.sections.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">🚀 Quick Start Guide</h3>
            <div className="space-y-2 text-blue-700">
              <p>• <strong>Click "Add Section"</strong> to create your first section</p>
              <p>• <strong>Edit the title</strong> by clicking on "New Section"</p>
              <p>• <strong>Add questions</strong> using the + button next to each section</p>
              <p>• <strong>Add subsections</strong> for more detailed organization</p>
            </div>
            <Button 
              onClick={() => setShowQuickStart(false)} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Got it, hide this
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {guide.sections.map((section, sectionIndex) => (
            <div key={`section-${sectionIndex}`} className="border border-gray-200 rounded-lg p-4 bg-white">
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => toggleSection(section.number)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  {expandedSections.has(section.number) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={section.number}
                    onChange={(e) => updateSection(sectionIndex, 'number', e.target.value)}
                    className="w-16 text-center font-medium"
                    placeholder="1"
                  />
                  <span className="text-gray-500">:</span>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                    className="flex-1 font-medium"
                    placeholder="Enter section title..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addQuestion(sectionIndex)}
                    className="text-green-600 hover:text-green-700"
                    title="Add question to this section"
                  >
                    <Plus size={16} />
                    Question
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSubsection(sectionIndex)}
                    title="Add subsection"
                  >
                    <Plus size={16} />
                    Subsection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSection(sectionIndex)}
                    className="text-red-600 hover:text-red-700"
                    title="Delete this section"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {/* Section Content */}
              {expandedSections.has(section.number) && (
                <div className="ml-8 space-y-4">
                  {/* Section Questions */}
                  {section.questions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Questions:</h4>
                      {section.questions.map((question, questionIndex) => (
                        <div key={question.id} className="flex items-start gap-2 bg-gray-50 p-3 rounded">
                          <span className="text-gray-500 text-sm mt-2">Q{questionIndex + 1}:</span>
                          <Textarea
                            value={question.text}
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, e.target.value)}
                            className="flex-1"
                            placeholder="Enter your question..."
                            rows={2}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteQuestion(sectionIndex, questionIndex)}
                            className="text-red-600 hover:text-red-700 mt-1"
                            title="Delete this question"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Subsections */}
                  {section.subsections.map((subsection, subsectionIndex) => (
                    <div key={`subsection-${sectionIndex}-${subsectionIndex}`} className="border-l-2 border-gray-300 pl-4">
                      <div className="flex items-center gap-3 mb-3">
                        <button
                          onClick={() => toggleSubsection(subsection.number)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {expandedSubsections.has(subsection.number) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={subsection.number}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'number', e.target.value)}
                            className="w-20 text-center"
                            placeholder="1.1"
                          />
                          <span className="text-gray-500">:</span>
                          <Input
                            value={subsection.title}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'title', e.target.value)}
                            className="flex-1"
                            placeholder="Enter subsection title..."
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(sectionIndex, subsectionIndex)}
                            className="text-green-600 hover:text-green-700"
                            title="Add question to this subsection"
                          >
                            <Plus size={14} />
                            Question
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSubsection(sectionIndex, subsectionIndex)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete this subsection"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Subsection Questions */}
                      {expandedSubsections.has(subsection.number) && (
                        <div className="ml-6 space-y-2">
                          {subsection.questions.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-gray-600">Questions:</h5>
                              {subsection.questions.map((question, questionIndex) => (
                                <div key={question.id} className="flex items-start gap-2 bg-gray-50 p-3 rounded">
                                  <span className="text-gray-500 text-sm mt-2">Q{questionIndex + 1}:</span>
                                  <Textarea
                                    value={question.text}
                                    onChange={(e) => updateQuestion(sectionIndex, questionIndex, e.target.value, subsectionIndex)}
                                    className="flex-1"
                                    placeholder="Enter your question..."
                                    rows={2}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteQuestion(sectionIndex, questionIndex, subsectionIndex)}
                                    className="text-red-600 hover:text-red-700 mt-1"
                                    title="Delete this question"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Add Section Button */}
          <Button 
            onClick={addSection} 
            variant="outline" 
            className="w-full py-4 border-dashed border-2 hover:border-solid transition-all"
          >
            <Plus size={20} className="mr-2" />
            Add New Section
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button 
            onClick={onNext} 
            disabled={guide.sections.length === 0}
            className="px-8"
          >
            Save & Continue →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 