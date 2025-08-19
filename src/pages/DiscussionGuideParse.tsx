import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { parseGuideFromText, type SimpleGuide, type ParseMetrics } from '../lib/simple-guide-parser';
import { FN } from '../lib/functions';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Upload, FileText, File, FileType, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SimpleContentAnalysis() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [guideText, setGuideText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{ guide: SimpleGuide; metrics: ParseMetrics } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    
    const { data, error } = await supabase
      .from('research_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error loading project:', error);
      return;
    }

    setProject(data);
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      let text = '';
      
      if (file.type === 'text/plain') {
        // Handle TXT files
        text = await file.text();
      } else if (file.type === 'application/pdf') {
        // Handle PDF files - would need PDF parsing library
        setUploadError('PDF upload coming soon! For now, please copy-paste the text.');
        setIsUploading(false);
        return;
      } else if (file.type.includes('word') || file.type.includes('document')) {
        // Handle Word files - would need DOCX parsing library
        setUploadError('Word document upload coming soon! For now, please copy-paste the text.');
        setIsUploading(false);
        return;
      } else {
        setUploadError('Unsupported file type. Please use TXT, PDF, or Word documents.');
        setIsUploading(false);
        return;
      }
      
      setGuideText(text);
      setIsUploading(false);
    } catch (error) {
      console.error('Error reading file:', error);
      setUploadError('Error reading file. Please try again.');
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleParseGuide = async () => {
    if (!guideText.trim()) return;
    
    setIsParsing(true);
    try {
      const result = await parseGuideFromText(guideText);
      setParseResult(result);
      
      // Save the parsed guide to the project
      if (projectId) {
        await supabase
          .from('research_projects')
          .update({ 
            guide_context: JSON.stringify(result.guide),
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      }
    } catch (error) {
      console.error('Error parsing guide:', error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!projectId || !parseResult) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(false);
    
    try {
      console.log('🚀 Starting content analysis...');
      console.log('Project ID:', projectId);
      console.log('Guide sections:', parseResult.guide.sections.length);
      console.log('Total questions:', parseResult.metrics.totalQuestions);

      // Convert the guide to the format expected by the worker
      const analysisQuestions = [];
      for (const section of parseResult.guide.sections) {
        for (const question of section.questions) {
          analysisQuestions.push({
            question_type: 'structured',
            question: question,
            section: section.title,
            subsection: null,
            respondents: {}
          });
        }
      }

      console.log('📋 Prepared questions for analysis:', analysisQuestions.length);

      // Call the content analysis worker
      const { data, error } = await supabase.functions.invoke(FN.WORKER, {
        body: {
          project_id: projectId,
          guide_questions: analysisQuestions,
          guide_context: JSON.stringify(parseResult.guide)
        }
      });

      if (error) {
        console.error('❌ Worker error:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Analysis started successfully:', data);
      setAnalysisSuccess(true);
      
      // Show success message and redirect after a delay
      setTimeout(() => {
        navigate(`/dashboard/projects/${projectId}/analysis/content`);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error starting analysis:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to start analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!project) {
    return <div className="p-6">Loading project...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/projects/${projectId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {project.name} - Discussion Guide Parser
          </h1>
          <p className="text-muted-foreground">
            Upload or paste your discussion guide for automatic parsing and analysis
          </p>
        </div>
      </motion.div>

      {!parseResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Discussion Guide
            </CardTitle>
            <CardDescription>
              Upload a file or paste your discussion guide text for automatic parsing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Format Guide */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Best Format:</strong> Copy-paste from Word/PDF preserves formatting best. 
                File upload coming soon for direct PDF/Word support.
              </AlertDescription>
            </Alert>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload your discussion guide</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop or click to select a file
              </p>
              
              <div className="flex justify-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Word (.docx)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span className="text-sm">PDF (.pdf)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileType className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Text (.txt)</span>
                </div>
              </div>

              <Button 
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Choose File'}
              </Button>
              
              <input
                id="file-input"
                type="file"
                accept=".txt,.pdf,.docx,.doc"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {/* Or Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Manual Text Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Paste your discussion guide text
              </label>
              <Textarea
                value={guideText}
                onChange={(e) => setGuideText(e.target.value)}
                placeholder="Paste your discussion guide here... (Best: Copy from Word/PDF to preserve formatting)"
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleParseGuide} 
              disabled={!guideText.trim() || isParsing}
              className="w-full"
            >
              {isParsing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Parsing Guide...
                </>
              ) : (
                'Parse Discussion Guide'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Guide Parsed Successfully
            </CardTitle>
            <p className="text-muted-foreground">
              Your discussion guide has been structured and is ready for analysis.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{parseResult.metrics.sections}</div>
                <div className="text-sm text-muted-foreground">Sections</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{parseResult.metrics.totalQuestions}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{parseResult.metrics.rawQL}</div>
                <div className="text-sm text-muted-foreground">Raw Questions</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{(parseResult.metrics.coverage * 100).toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Coverage</div>
              </div>
            </div>

            {/* Coverage Warning */}
            {parseResult.metrics.coverage < 0.7 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Low coverage detected ({(parseResult.metrics.coverage * 100).toFixed(0)}%).</strong> 
                  Consider uploading the original Word/PDF file for better parsing results.
                </AlertDescription>
              </Alert>
            )}

            {/* Guide Preview */}
            <div>
              <h3 className="font-semibold mb-3">Guide Structure Preview</h3>
              <div className="space-y-2">
                {parseResult.guide.sections.map((section, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium text-blue-600">
                      Section {index + 1}: {section.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {section.questions.length} questions
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                onClick={handleRunAnalysis}
                className="flex-1"
                size="lg"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Run Content Analysis with Parsed Guide'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setParseResult(null)}
              >
                Parse New Guide
              </Button>
            </div>

            {analysisError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
            )}

            {analysisSuccess && (
              <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Analysis started successfully! Redirecting to results...</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 