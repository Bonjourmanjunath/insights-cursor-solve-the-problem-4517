import { supabase } from "@/integrations/supabase/client";

export async function getAnalysisResults(projectId: string) {
  try {
    const { data, error } = await supabase
      .from("analysis_results")
      .select("*")
      .eq("research_project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching analysis results:", error);
    return [];
  }
}

export async function getContentAnalysisResults(projectId: string) {
  try {
    const { data, error } = await supabase
      .from("content_analysis_results")
      .select("*")
      .eq("research_project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching content analysis results:", error);
    return [];
  }
}
