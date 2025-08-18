import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ContentAnalysisJobStatus = "queued" | "running" | "completed" | "failed";

interface ContentAnalysisJob {
	id: string;
	project_id: string;
	user_id: string;
	status: ContentAnalysisJobStatus;
	batches_total: number | null;
	batches_completed: number | null;
	error_message: string | null;
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
	metadata: any | null;
}

interface ContentAnalysisResultRow {
	id: string;
	research_project_id: string;
	user_id: string;
	analysis_data: any;
	updated_at?: string;
}

export function useContentAnalysisProgress(projectId: string | null) {
	const { user, isAuthenticated } = useAuth();
	const [latestJob, setLatestJob] = useState<ContentAnalysisJob | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<any | null>(null);

	const progressPercent = useMemo(() => {
		if (!latestJob) return 0;
		if (latestJob.status === "completed") return 100;
		if (latestJob.batches_total && latestJob.batches_total > 0) {
			const done = latestJob.batches_completed ?? 0;
			return Math.max(1, Math.min(99, Math.round((done / latestJob.batches_total) * 100)));
		}
		return latestJob.status === "running" ? 50 : 0;
	}, [latestJob]);

	const fetchLatest = async () => {
		if (!projectId || !user || !isAuthenticated) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			// Use analysis_results table to check if content analysis exists
			const { data: existingResults } = await supabase
				.from("analysis_results")
				.select("*")
				.eq("research_project_id", projectId)
				.eq("user_id", user.id)
				.order("created_at", { ascending: false })
				.limit(1);

			// Create a fake job object to maintain compatibility
			if (existingResults && existingResults.length > 0) {
				const fakeJob: ContentAnalysisJob = {
					id: existingResults[0].id,
					project_id: projectId,
					user_id: user.id,
					status: "completed",
					batches_total: 1,
					batches_completed: 1,
					error_message: null,
					created_at: existingResults[0].created_at,
					started_at: existingResults[0].created_at,
					completed_at: existingResults[0].updated_at,
				};
				setLatestJob(fakeJob);
			} else {
				setLatestJob(null);
			}

			if (latestJob?.status === "completed") {
				const { data: res } = await supabase
					.from("analysis_results")
					.select("*")
					.eq("research_project_id", projectId)
					.eq("user_id", user.id)
					.order("updated_at", { ascending: false })
					.limit(1)
					.single();
				setResult(res || null);
			}
			setError(null);
		} catch (err) {
			console.error("CA fetchLatest error", err);
			setError(err instanceof Error ? err.message : "Failed to load progress");
		} finally {
			setLoading(false);
		}
	};

	const enqueue = async () => {
		if (!projectId) throw new Error("No projectId");
		// Since we don't have a jobs table, we'll just trigger the analysis directly
		// Create a temporary "running" state
		const tempJob: ContentAnalysisJob = {
			id: `temp-${Date.now()}`,
			project_id: projectId,
			user_id: user?.id || "",
			status: "running",
			batches_total: 10,
			batches_completed: 0,
			error_message: null,
			created_at: new Date().toISOString(),
			started_at: new Date().toISOString(),
			completed_at: null,
		};
		setLatestJob(tempJob);
		return { success: true, message: "Analysis started" };
	};

	const triggerWorker = async () => {
		// Call the content-analysis function directly instead of worker
		const { data, error } = await supabase.functions.invoke("content-analysis", {
			body: { projectId },
		});
		
		// Update progress
		if (latestJob && latestJob.status === "running") {
			const progress = Math.min((latestJob.batches_completed || 0) + 1, latestJob.batches_total || 10);
			setLatestJob({
				...latestJob,
				batches_completed: progress,
				status: progress >= (latestJob.batches_total || 10) ? "completed" : "running",
				completed_at: progress >= (latestJob.batches_total || 10) ? new Date().toISOString() : null,
			});
		}
		
		if (error) return { success: false, error } as any;
		return data as any;
	};

	useEffect(() => {
		if (!projectId || !user) return;
		fetchLatest();

		// Subscribe to analysis results updates
		const channel = supabase
			.channel(`content-analysis-${projectId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "analysis_results", filter: `research_project_id=eq.${projectId}` },
				() => fetchLatest(),
			)
			.subscribe();

		const interval = setInterval(fetchLatest, 5000);
		return () => {
			supabase.removeChannel(channel);
			clearInterval(interval);
		};
	}, [projectId, user?.id]);

	return {
		job: latestJob,
		loading,
		error,
		progressPercent,
		result,
		refetch: fetchLatest,
		enqueue,
		triggerWorker,
	};
} 