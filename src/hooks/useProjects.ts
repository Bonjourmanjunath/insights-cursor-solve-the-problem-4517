import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Version check - this will help confirm you're running the latest code
console.log("🔍 useProjects.ts loaded - Version:", new Date().toISOString(), "Commit: ec5a104");

export interface Project {
  id: string;
  name: string;
  description?: string;
  research_goal?: string;
  user_id: string;
  document_count: number;
  code_count: number;
  quotation_count: number;
  created_at: string;
  updated_at: string;
  // FMR Configuration Fields
  project_type?: string;
  stakeholder_type?: string;
  country?: string;
  therapy_area?: string;
  language?: string;
  guide_context?: string;
  priority?: "low" | "medium" | "high";
  deadline?: string;
  owner?: string;
  transcript_format?: string;
  rfp_summary?: string;
  research_hypothesis?: string;
  research_dictionary?: string;
}

export function useProjects() {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!isAuthenticated || !user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke(
        "project-management",
        {
          body: {
            method: "GET_PROJECTS",
            body: {
              user_id: user.id,
            },
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setProjects(data.projects || []);
      } else {
        throw new Error(data?.error || "Failed to fetch projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: {
    name: string;
    description?: string;
    research_goal?: string;
    project_type?: string;
    stakeholder_type?: string;
    country?: string;
    therapy_area?: string;
    language?: string;
    guide_context?: string;
    priority?: "low" | "medium" | "high";
    deadline?: string;
    owner?: string;
    transcript_format?: string;
    rfp_summary?: string;
    research_hypothesis?: string;
    research_dictionary?: string;
  }) => {
    if (!isAuthenticated || !user) {
      throw new Error("User not authenticated");
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "project-management",
        {
          body: {
            method: "CREATE_PROJECT",
            body: {
              ...projectData,
              user_id: user.id,
            },
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setProjects((prev) => [data.project, ...prev]);
        return data.project;
      } else {
        throw new Error(data?.error || "Failed to create project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      throw err;
    }
  };

  const updateProject = async (
    projectId: string,
    updates: Partial<Project>,
  ) => {
    if (!isAuthenticated || !user) {
      throw new Error("User not authenticated");
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "project-management",
        {
          body: {
            method: "UPDATE_PROJECT",
            body: {
              project_id: projectId,
              user_id: user.id,
              updates,
            },
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p)),
        );
        return data.project;
      } else {
        throw new Error(data?.error || "Failed to update project");
      }
    } catch (err) {
      console.error("Error updating project:", err);
      throw err;
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!isAuthenticated || !user) {
      throw new Error("User not authenticated");
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "project-management",
        {
          body: {
            method: "DELETE_PROJECT",
            body: {
              project_id: projectId,
              user_id: user.id,
            },
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        throw new Error(data?.error || "Failed to delete project");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProjects();
    }
  }, [isAuthenticated, user]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}
