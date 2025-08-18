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
			// @ts-ignore - table not in generated types yet
			const { data: jobs } = await supabase
				.from("content_analysis_jobs")
				.select("*")
				.eq("project_id", projectId)
				.eq("user_id", user.id)
				.order("created_at", { ascending: false })
				.limit(1);

			setLatestJob(((jobs as any)?.[0] as ContentAnalysisJob) || null);

			if ((jobs as any)?.[0]?.status === "completed") {
				// @ts-ignore - table not in generated types yet
				const { data: res } = await supabase
					.from("content_analysis_results")
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
		console.log("[CA] Starting enqueue for projectId:", projectId);
		
		try {
			const { data, error } = await supabase.functions.invoke("content-analysis-queue", {
				body: { project_id: projectId },
			});
			
			if (error) {
				console.error("[CA] Queue error:", error);
				// Handle ReadableStream errors
				let errorMessage = "Failed to enqueue content analysis job";
				if (error.message) {
					errorMessage = error.message;
				} else if (error.raw && typeof error.raw.text === 'function') {
					try {
						const text = await error.raw.text();
						const parsed = JSON.parse(text);
						errorMessage = parsed.error || parsed.message || errorMessage;
					} catch (e) {
						console.error("[CA] Failed to parse error response:", e);
					}
				}
				throw new Error(errorMessage);
			}
			
			if (!data?.success) {
				console.error("[CA] Queue failed:", data?.error || "Unknown error");
				throw new Error(data?.error || "Failed to enqueue content analysis job");
			}
			
			console.log("[CA] Queue success:", data);
			await fetchLatest();
			return data;
		} catch (err) {
			console.error("[CA] Enqueue failed:", err);
			throw err;
		}
	};

	const triggerWorker = async () => {
		const { data, error } = await supabase.functions.invoke("content-analysis-worker");
		if (error) return { success: false, error } as any;
		return data as any;
	};

	useEffect(() => {
		if (!projectId || !user) return;
		fetchLatest();

		// Subscribe to job updates; also keep a polling fallback.
		const channel = supabase
			.channel(`content-analysis-${projectId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "content_analysis_jobs", filter: `project_id=eq.${projectId}` },
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