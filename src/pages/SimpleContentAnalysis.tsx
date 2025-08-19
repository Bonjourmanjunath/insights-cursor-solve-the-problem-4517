import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { Upload, FileText, Play, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AnalysisResult {
  question: string;
  transcript: string;
  quote: string;
  summary: string;
  theme: string;
}

export default function SimpleContentAnalysis() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('research_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err) {
      console.error('Error loading project:', err);
      toast({
        title: "❌ Error",
        description: "Failed to load project",
        variant: "destructive",
      });
    }
  };

  const runContentAnalysis = async () => {
    if (!project?.guide_context) {
      toast({
        title: "❌ No Guide Found",
        description: "Please parse a discussion guide first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults([]);

    try {
      console.log('🚀 Starting content analysis...');
      
      // Step 1: Create analysis job
      const { data: jobData, error: jobError } = await supabase.functions.invoke('content-analysis-queue', {
        body: { project_id: projectId }
      });

      if (jobError || !jobData?.ok) {
        throw new Error(jobError?.message || 'Failed to create analysis job');
      }

      console.log('✅ Job created:', jobData);
      setProgress(20);

      // Step 2: Start the worker
      const { error: workerError } = await supabase.functions.invoke('content-analysis-worker', {
        body: { job_id: jobData.job_id }
      });

      if (workerError) {
        console.warn('Worker error (might be expected):', workerError);
      }

      setProgress(40);

      // Step 3: Poll for results
      let attempts = 0;
      const maxAttempts = 30;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        setProgress(40 + (attempts / maxAttempts) * 50);

        try {
          const { data: job, error } = await (supabase as any)
            .from('content_analysis_jobs')
            .select('*')
            .eq('id', jobData.job_id)
            .single();

          if (error) throw error;

          if (job.status === 'completed') {
            clearInterval(pollInterval);
            setProgress(100);
            
            // Load results
            const { data: resultsData, error: resultsError } = await (supabase as any)
              .from('content_analysis_results')
              .select('*')
              .eq('job_id', jobData.job_id);

            if (resultsError) throw resultsError;

            setResults((resultsData as AnalysisResult[]) || []);
            
            toast({
              title: "✅ Analysis Complete!",
              description: `Found ${resultsData?.length || 0} insights`,
            });
            
            setLoading(false);
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(job.error || 'Analysis failed');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            throw new Error('Analysis timed out');
          }
        } catch (err) {
          clearInterval(pollInterval);
          throw err;
        }
      }, 2000);

    } catch (err) {
      console.error('❌ Content analysis error:', err);
      toast({
        title: "❌ Analysis Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
      setProgress(0);
    }
  };

  const exportToExcel = () => {
    // Simple CSV export for now
    const csvContent = [
      'Question,Transcript,Quote,Summary,Theme',
      ...results.map(r => `"${r.question}","${r.transcript}","${r.quote}","${r.summary}","${r.theme}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-analysis-${projectId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Exported!",
      description: "Content analysis exported to CSV",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Content Analysis
          </CardTitle>
          <CardDescription>
            Analyze transcripts against your discussion guide questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Info */}
          {project && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Project: {project.name}</h3>
              <p className="text-sm text-gray-600">
                {project.guide_context ? '✅ Discussion guide ready' : '❌ No discussion guide'}
              </p>
            </div>
          )}

          {/* Analysis Button */}
          <div className="flex gap-4">
            <Button 
              onClick={runContentAnalysis} 
              disabled={loading || !project?.guide_context}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Content Analysis
                </>
              )}
            </Button>

            {results.length > 0 && (
              <Button onClick={exportToExcel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            )}
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analysis Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results Matrix */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Analysis Results</h3>
              <div className="grid gap-4">
                {results.map((result, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600">Question</h4>
                        <p className="text-sm">{result.question}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600">Transcript</h4>
                        <p className="text-sm">{result.transcript}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600">Quote</h4>
                        <p className="text-sm bg-yellow-50 p-2 rounded">{result.quote}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600">Summary</h4>
                        <p className="text-sm">{result.summary}</p>
                      </div>
                      <div className="md:col-span-2">
                        <h4 className="font-semibold text-sm text-gray-600">Theme</h4>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {result.theme}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && results.length === 0 && project?.guide_context && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
              <p className="text-gray-600">
                Click "Run Content Analysis" to analyze your transcripts against the discussion guide.
              </p>
            </div>
          )}

          {/* No Guide */}
          {!project?.guide_context && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Discussion Guide</h3>
              <p className="text-gray-600 mb-4">
                You need to parse a discussion guide first before running content analysis.
              </p>
              <Button 
                onClick={() => window.location.href = `/dashboard/projects/${projectId}/analysis/simple`}
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Parse Discussion Guide
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 