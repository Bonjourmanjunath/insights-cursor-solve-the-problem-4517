import React, { useState } from 'react';
import { Guide } from '../../../lib/GuideSchema';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { useAuth } from '../../../hooks/useAuth';
import { useContentAnalysisProgress } from '../../../hooks/useContentAnalysisProgress';
import { saveGuide } from '../../../lib/guide-utils';

interface Step4_RunProps {
  projectId: string;
  guide: Guide;
  onBack: () => void;
  onComplete: () => void;
}

export default function Step4_Run({ projectId, guide, onBack, onComplete }: Step4_RunProps) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  
  const { enqueue, triggerWorker, job, result, loading } = useContentAnalysisProgress(projectId);

  const handleRunAnalysis = async () => {
    try {
      setIsRunning(true);
      setError('');
      setStatus('Saving guide to database...');

      // 1. Save the guide to the project using the new function
      await saveGuide(projectId, guide);
      console.log('Guide saved successfully');

      setStatus('Guide saved! Starting content analysis...');

      // 2. Enqueue the content analysis job
      console.log('Attempting to enqueue job...');
      const enqueueResult = await enqueue();
      console.log('Enqueue result:', enqueueResult);
      
      if (!enqueueResult.success) {
        throw new Error(`Failed to enqueue job: ${enqueueResult.error}`);
      }

      setStatus('Job enqueued! Triggering worker...');

      // 3. Trigger the worker
      console.log('Attempting to trigger worker...');
      const workerResult = await triggerWorker();
      console.log('Worker result:', workerResult);
      
      if (!workerResult.success) {
        throw new Error(`Failed to trigger worker: ${workerResult.error}`);
      }

      setStatus('Analysis started! Monitoring progress...');

      // 4. Monitor progress (the hook will handle this)
      // The onComplete will be called when results are ready

    } catch (err) {
      console.error('Error running analysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsRunning(false);
    }
  };

  // Monitor for completion
  React.useEffect(() => {
    if (result && result.analysis_data) {
      setStatus('Analysis complete!');
      setIsRunning(false);
      onComplete();
    }
  }, [result, onComplete]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run Content Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-6">
          Your guide is ready! Click the button below to start the content analysis.
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">
              ❌ Error: {error}
            </p>
          </div>
        )}

        {status && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              📊 {status}
            </p>
            {job && job.status === 'running' && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${job.batches_completed && job.batches_total ? Math.round((job.batches_completed / job.batches_total) * 100) : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Progress: {job.batches_completed || 0} / {job.batches_total || 0} batches
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isRunning}>
            Back
          </Button>
          <Button 
            data-run-analysis-btn
            type="button"
            onPointerDown={() => console.log('pointer down')}
            onClick={() => {
              alert('Button clicked! Check console for details.');
              console.log('Button clicked!');
              console.log('isRunning:', isRunning);
              console.log('guide?.sections?.length:', guide?.sections?.length);
              handleRunAnalysis();
            }} 
            disabled={isRunning || !guide?.sections?.length}
            className={`relative z-50 ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRunning ? 'Running Analysis...' : 'Run Content Analysis'}
          </Button>
        </div>
        
        {/* Debug info */}
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <p>Debug: isRunning = {isRunning.toString()}</p>
          <p>Debug: guide?.sections?.length = {guide?.sections?.length}</p>
          <p>Debug: button disabled = {(isRunning || !guide?.sections?.length).toString()}</p>
          <p>Debug: Run this in console to check for overlays:</p>
          <code className="block mt-2 p-1 bg-gray-200 rounded">
            {`const btn = document.querySelector('[data-run-analysis-btn]');
const r = btn.getBoundingClientRect();
document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);`}
          </code>
        </div>
      </CardContent>
    </Card>
  );
} 