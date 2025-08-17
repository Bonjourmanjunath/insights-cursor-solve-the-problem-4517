import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface IngestJob {
  id: string;
  project_id: string;
  document_id: string;
  status: "queued" | "running" | "completed" | "failed";
  error_message?: string;
  metadata?: any;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface IngestProgress {
  project_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  total_documents: number;
  jobs_total: number;
  jobs_completed: number;
  jobs_failed: number;
  estimated_completion?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
}

export function useIngestProgress(projectId: string | null) {
  const { user, isAuthenticated } = useAuth();
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch progress and jobs
  const fetchProgress = async () => {
    if (!isAuthenticated || !user || !projectId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch progress metadata
      const { data: progressData, error: progressError } = await supabase
        .from("project_ingest_metadata")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single();

      if (progressError && progressError.code !== "PGRST116") {
        throw progressError;
      }

      setProgress(progressData);

      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("ingest_jobs")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (jobsError) {
        throw jobsError;
      }

      setJobs(jobsData || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching ingest progress:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch progress");
    } finally {
      setLoading(false);
    }
  };

  // Trigger ingest
  const triggerIngest = async () => {
    if (!isAuthenticated || !user || !projectId) {
      throw new Error("Not authenticated or no project selected");
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "project-ingest-queue",
        {
          body: {
            project_id: projectId,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to queue ingest jobs");
      }

      // Refresh progress
      await fetchProgress();

      return data;
    } catch (err) {
      console.error("Error triggering ingest:", err);
      throw err;
    }
  };

  // Process jobs (trigger workers)
  const processJobs = async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      // Call worker function (this would typically be done by a cron job)
      const { data, error } = await supabase.functions.invoke("ingest-worker");

      if (error) {
        console.error("Worker error:", error);
      }

      // Refresh progress
      await fetchProgress();

      return data;
    } catch (err) {
      console.error("Error processing jobs:", err);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!projectId || !user) return;

    fetchProgress();

    // Subscribe to progress updates
    const progressSub = supabase
      .channel(`ingest-progress-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_ingest_metadata",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchProgress();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingest_jobs",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchProgress();
        }
      )
      .subscribe();

    // Poll for updates every 5 seconds if processing
    let pollInterval: NodeJS.Timeout;
    if (progress?.status === "processing" || progress?.status === "queued") {
      pollInterval = setInterval(fetchProgress, 5000);
    }

    return () => {
      progressSub.unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [projectId, user, progress?.status]);

  // Calculate overall progress percentage
  const progressPercentage = progress
    ? progress.jobs_total > 0
      ? Math.round(
          ((progress.jobs_completed + progress.jobs_failed) /
            progress.jobs_total) *
            100
        )
      : 0
    : 0;

  // Check if ingest is needed
  const needsIngest = jobs.length === 0 && progress?.status !== "completed";

  return {
    progress,
    jobs,
    loading,
    error,
    progressPercentage,
    needsIngest,
    triggerIngest,
    processJobs,
    refetch: fetchProgress,
  };
} 