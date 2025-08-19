import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AIChat from "@/components/AIChat";

interface Project {
  id: string;
  name: string;
  project_type?: string;
  stakeholder_type?: string;
  country?: string;
  therapy_area?: string;
  research_goal?: string;
}

export default function ProjectChat() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
      return;
    }
    
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);

      const { data: projectData, error } = await supabase
        .from('research_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        throw new Error('Project not found');
      }

      setProject(projectData);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProjectTypeDisplay = (projectType?: string) => {
    if (!projectType) return "Not specified";
    
    return projectType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const createProjectContext = () => {
    if (!project) return "";
    
    return `
Project Context:
- Name: ${project.name}
- Type: ${getProjectTypeDisplay(project.project_type)}
- Stakeholder: ${project.stakeholder_type || 'Not specified'}
- Country: ${project.country || 'Not specified'}
- Therapy Area: ${project.therapy_area || 'Not specified'}
- Research Goal: ${project.research_goal || 'Not specified'}

You are helping analyze qualitative research data for this FMR project. Please provide insights based on the project configuration and any analysis results that may be available.
    `.trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
        <Button onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {project.name} - AI Chat
          </h1>
          <p className="text-muted-foreground">
            Discuss insights and ask questions about your FMR project
          </p>
        </div>
      </motion.div>

      {/* Project Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Project Context
            <Badge variant="outline">
              {getProjectTypeDisplay(project.project_type)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {project.stakeholder_type && (
              <div>
                <span className="font-medium text-muted-foreground">Stakeholder:</span>
                <div>{project.stakeholder_type}</div>
              </div>
            )}
            {project.country && (
              <div>
                <span className="font-medium text-muted-foreground">Country:</span>
                <div>{project.country}</div>
              </div>
            )}
            {project.therapy_area && (
              <div>
                <span className="font-medium text-muted-foreground">Therapy Area:</span>
                <div>{project.therapy_area}</div>
              </div>
            )}
            <div>
              <span className="font-medium text-muted-foreground">Analysis Type:</span>
              <div>{getProjectTypeDisplay(project.project_type)}</div>
            </div>
          </div>
          
          {project.research_goal && (
            <div className="mt-4 pt-4 border-t">
              <span className="font-medium text-muted-foreground">Research Goal:</span>
              <p className="mt-1 text-sm">{project.research_goal}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Chat Component */}
      <div className="h-[600px]">
        <AIChat />
      </div>
    </div>
  );
}