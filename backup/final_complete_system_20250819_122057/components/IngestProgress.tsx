import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  RefreshCw,
} from "lucide-react";

interface IngestProgressProps {
  progress: any;
  jobs: any[];
  progressPercentage: number;
  needsIngest: boolean;
  onTriggerIngest: () => Promise<void>;
  onProcessJobs: () => Promise<void>;
  loading?: boolean;
}

export function IngestProgress({
  progress,
  jobs,
  progressPercentage,
  needsIngest,
  onTriggerIngest,
  onProcessJobs,
  loading = false,
}: IngestProgressProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
      processing: "secondary",
      queued: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading ingest status...
      </div>
    );
  }

  if (needsIngest) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>Documents need to be processed for analysis</span>
          <Button
            size="sm"
            onClick={onTriggerIngest}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Process Documents
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!progress) {
    return null;
  }

  const isProcessing = progress.status === "processing" || progress.status === "queued";
  const hasFailures = progress.jobs_failed > 0;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Document Processing {getStatusBadge(progress.status)}
          </span>
          <span className="text-muted-foreground">
            {progress.jobs_completed} of {progress.jobs_total} completed
            {hasFailures && ` (${progress.jobs_failed} failed)`}
          </span>
        </div>
        
        <Progress value={progressPercentage} className="h-2" />
        
        {progress.estimated_completion && isProcessing && (
          <p className="text-xs text-muted-foreground">
            Estimated completion: {new Date(progress.estimated_completion).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Job Details */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Processing Jobs</h4>
            {isProcessing && (
              <Button
                size="sm"
                variant="outline"
                onClick={onProcessJobs}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Process Next
              </Button>
            )}
          </div>
          
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 text-sm border rounded-md"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="truncate max-w-xs">
                    {job.metadata?.document_name || "Document"}
                  </span>
                </div>
                {job.error_message && (
                  <span className="text-xs text-red-500 truncate max-w-xs">
                    {job.error_message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasFailures && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{progress.jobs_failed} documents failed to process</span>
            <Button
              size="sm"
              variant="outline"
              onClick={onTriggerIngest}
            >
              Retry Failed
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 