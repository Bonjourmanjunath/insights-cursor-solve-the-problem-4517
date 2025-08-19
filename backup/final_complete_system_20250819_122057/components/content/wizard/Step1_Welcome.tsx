import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface Step1_WelcomeProps {
  onNext: () => void;
  onCancel: () => void;
}

export default function Step1_Welcome({ onNext, onCancel }: Step1_WelcomeProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg border-0">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold text-gray-900 mb-4">
            Add Your Discussion Guide
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Enter sections, subsections, and questions in a structured format to guarantee perfect mapping and high-quality insights.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Structured Format</h3>
              <p className="text-sm text-gray-600">Organize your guide with clear sections and subsections</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Perfect Mapping</h3>
              <p className="text-sm text-gray-600">Questions are automatically mapped to your guide structure</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">High-Quality Insights</h3>
              <p className="text-sm text-gray-600">Get detailed analysis for each question and section</p>
            </div>
          </div>

          {/* Example */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Example Structure:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Section 1: Introduction</div>
              <div>• Section 2: Market Analysis</div>
              <div>  - Subsection 2.1: Current State</div>
              <div>  - Subsection 2.2: Future Trends</div>
              <div>• Section 3: Recommendations</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onNext} className="px-8">
              Start Building Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 