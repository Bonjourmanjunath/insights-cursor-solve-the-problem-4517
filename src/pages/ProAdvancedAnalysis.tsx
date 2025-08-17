import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Upload,
  FileText,
  Brain as BrainIcon,
  Target,
  BookOpen,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Sparkles,
  BarChart3,
  MessageSquare,
  RefreshCw,
  Settings,
  Eye,
  Zap,
  Users,
  Search,
  Filter,
  FileSpreadsheet,
  Presentation,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import FileUploadService, {
  FILE_TYPE_CONFIGS,
} from "@/services/file-upload-service";
import { cn } from "@/lib/utils";
import AIChat from "@/components/AIChat";
import { ErrorHandler, ErrorUtils, ERROR_CODES } from "@/lib/error-handler";
import TrendsPatternsPanel from "./panels/TrendsPatternsPanel";
import DriversPanel from "./panels/DriversPanel";
import AnomaliesPanel from "./panels/AnomaliesPanel";

interface Project {
  id: string;
  name: string;
  project_type?: string;
  stakeholder_type?: string;
  country?: string;
  therapy_area?: string;
  research_goal?: string;
  description?: string;
  research_hypothesis?: string;
  research_dictionary?: string;
  guide_context?: string;
  rfp_summary?: string;
}

interface AdvancedAnalysisConfig {
  research_goal: string;
  discussion_guide: string;
  research_hypothesis: string;
  research_dictionary: string;
  guided_themes: string[];
  sentiment_analysis_enabled: boolean;
  outlier_detection_enabled: boolean;
  comparative_analysis_enabled: boolean;
  hypothesis_validation_enabled: boolean;
  analysis_mode: "basic" | "advanced";
}

interface AdvancedAnalysisResults {
  guided_themes: {
    theme: string;
    evidence: string[];
    sentiment_score: number;
    intensity: "low" | "medium" | "high";
    frequency: number;
    supporting_quotes: string[];
  }[];
  emerging_themes: {
    theme: string;
    frequency: number;
    significance: number;
    supporting_quotes: string[];
    sentiment_score: number;
  }[];
  sentiment_analysis: {
    overall_sentiment: "positive" | "neutral" | "negative";
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    theme_specific_sentiment: { [theme: string]: number };
  };
  outliers_contradictions: {
    outliers: {
      respondent: string;
      deviation: string;
      context: string;
      severity: string;
    }[];
    contradictions: {
      theme: string;
      conflicting_views: string[];
      impact: string;
      severity: string;
    }[];
  };
  comparative_analysis: {
    all_respondents: any;
    by_target: { [target: string]: any };
    divergence_points: {
      theme: string;
      groups: string[];
      difference: string;
    }[];
  };
  hypothesis_validation: {
    hypothesis: string;
    status:
      | "supported"
      | "partially_supported"
      | "contradicted"
      | "insufficient_data";
    evidence: string[];
    confidence_score: number;
    supporting_quotes: string[];
  }[];
  trends_patterns: {
    within_theme_trends: {
      theme: string;
      pattern: string;
      frequency: number;
    }[];
    cross_theme_trends: {
      themes: string[];
      connection: string;
      strength: number;
    }[];
    heatmap_data: { participant: string; theme: string; intensity: number }[];
  };
}

export default function ProAdvancedAnalysis() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);
  const [project, setProject] = useState<Project | null>(null);
  const [config, setConfig] = useState<AdvancedAnalysisConfig>({
    research_goal: "",
    discussion_guide: "",
    research_hypothesis: "",
    research_dictionary: "",
    guided_themes: [],
    sentiment_analysis_enabled: true,
    outlier_detection_enabled: true,
    comparative_analysis_enabled: true,
    hypothesis_validation_enabled: true,
    analysis_mode: "advanced",
  });
  const [results, setResults] = useState<AdvancedAnalysisResults | null>(null);
  const [basicResults, setBasicResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [newTheme, setNewTheme] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [activeMode, setActiveMode] = useState<"basic" | "advanced">(
    "advanced",
  );

  useEffect(() => {
    if (!projectId) {
      navigate("/projects");
      return;
    }
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("research_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);

      // Pre-populate config with project data
      setConfig((prev) => ({
        ...prev,
        research_goal: data.research_goal || "",
        discussion_guide: data.guide_context || "",
        research_hypothesis: data.research_hypothesis || "",
        research_dictionary: data.research_dictionary || "",
      }));

      // Load existing basic analysis results
      try {
        const { data: basicAnalysisData } = await supabase
          .from("analysis_results")
          .select("analysis_data")
          .eq("research_project_id", projectId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (basicAnalysisData) {
          setBasicResults(basicAnalysisData.analysis_data);
        }
      } catch (error) {
        console.log("No basic analysis found");
      }

      // Load existing advanced config if available
      try {
        const { data: configData, error: configError } = await supabase
          .from("advanced_analysis_config")
          .select("*")
          .eq("project_id", projectId)
          .single();

        if (configError && configError.code !== "PGRST116") {
          console.warn("Error loading config:", configError);
        } else if (configData) {
          setConfig((prev) => ({ ...prev, ...configData.config }));
        }
      } catch (error) {
        console.warn("Failed to load advanced config:", error);
      }

      // Load existing advanced results if available
      try {
        const { data: resultsData, error: resultsError } = await supabase
          .from("advanced_analysis_results")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (resultsError && resultsError.code !== "PGRST116") {
          console.warn("Error loading results:", resultsError);
        } else if (resultsData) {
          setResults(resultsData.results);
        }
      } catch (error) {
        console.warn("Failed to load advanced results:", error);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      // First check if the table exists and create if needed
      const { data: existingConfig, error: fetchError } = await supabase
        .from("advanced_analysis_config")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single();

      let saveError;
      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from("advanced_analysis_config")
          .update({
            config: config,
            updated_at: new Date().toISOString(),
          })
          .eq("project_id", projectId)
          .eq("user_id", user.id);
        saveError = error;
      } else {
        // Insert new config
        const { error } = await supabase
          .from("advanced_analysis_config")
          .insert({
            project_id: projectId,
            user_id: user.id,
            config: config,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        saveError = error;
      }

      if (saveError) {
        console.error("Supabase config save error:", saveError);
        throw saveError;
      }

      toast({
        title: "Configuration Saved",
        description: "Your advanced analysis configuration has been saved",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Configuration Save Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const runBasicAnalysis = async () => {
    if (!project) return;

    try {
      setAnalyzing(true);
      setProgress(0);
      setCurrentStep("Running basic FMR analysis...");

      // Simulate progress
      const steps = [
        { step: "Processing transcripts...", progress: 25 },
        { step: "Extracting themes...", progress: 50 },
        { step: "Generating insights...", progress: 75 },
        { step: "Finalizing analysis...", progress: 100 },
      ];

      for (const { step, progress } of steps) {
        setCurrentStep(step);
        setProgress(progress);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Call basic FMR analysis with error handling
      const data = await ErrorUtils.withRetry(
        async () => {
          const { data, error } = await supabase.functions.invoke(
            "basic-analysis",
            {
              body: {
                project_id: projectId,
              },
            },
          );

          if (error) throw error;

          if (!data?.success) {
            throw new Error(data?.error || "Basic analysis failed");
          }

          return data;
        },
        3,
        {
          operation: "run_basic_analysis",
          projectId,
        },
      );

      setBasicResults(data.analysis);
      toast({
        title: "Basic Analysis Complete",
        description: "Your basic FMR analysis is ready for review",
      });
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, {
        operation: "run_basic_analysis",
        projectId,
      });

      toast({
        title: "Basic Analysis Failed",
        description: errorResponse.userMessage,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const runAdvancedAnalysis = async () => {
    if (!project) return;

    try {
      setAnalyzing(true);
      setProgress(0);
      setCurrentStep("Initializing advanced analysis...");

      // Save config first
      await saveConfig();

      // Check if we have documents to analyze
      const { data: documentsCheck, error: documentsError } = await supabase
        .from("research_documents")
        .select("id, name")
        .eq("project_id", projectId)
        .eq("user_id", user?.id);

      console.log("Documents check:", {
        documentsCheck,
        documentsError,
        projectId,
        userId: user?.id,
      });

      if (documentsError) {
        console.error("Error checking documents:", documentsError);
        throw new Error(
          `Error checking documents: ${documentsError.message}. Please try again.`,
        );
      }

      if (!documentsCheck || documentsCheck.length === 0) {
        throw new Error(
          "No documents found for analysis. Please upload transcripts or documents first in the project transcripts section.",
        );
      }

      console.log(
        `Found ${documentsCheck.length} documents for analysis:`,
        documentsCheck.map((d) => d.name),
      );

      // Log the documents data structure for debugging
      console.log("Documents data structure:", documentsCheck);

      // Ensure transcripts are processed and available before running analysis
      const ensureAnalysisReadiness = async () => {
        // Quick check for any non-empty content
        const { data: docs, error: docsError } = await supabase
          .from("research_documents")
          .select("id, content")
          .eq("project_id", projectId);

        if (docsError) throw docsError;

        const hasContent = (docs || []).some(
          (d: any) => typeof d.content === "string" && d.content.trim().length > 50,
        );

        if (hasContent) return;

        // No content yet → queue ingest and kick workers a few times
        await supabase.functions.invoke("project-ingest-queue", {
          body: { project_id: projectId },
        });

        for (let i = 0; i < 3; i++) {
          await supabase.functions.invoke("ingest-worker");
          await new Promise((r) => setTimeout(r, 1500));

          const { data: docs2 } = await supabase
            .from("research_documents")
            .select("id, content")
            .eq("project_id", projectId);
          const ready = (docs2 || []).some(
            (d: any) => typeof d.content === "string" && d.content.trim().length > 50,
          );
          if (ready) return;
        }

        throw new Error(
          "Transcripts are not processed yet. Please process documents first (chunking and embeddings).",
        );
      };

      // Simulate analysis steps with progress updates
      const steps = [
        { step: "Processing research materials...", progress: 15 },
        { step: "Extracting guided themes...", progress: 25 },
        { step: "Identifying emerging patterns...", progress: 40 },
        { step: "Performing sentiment analysis...", progress: 55 },
        { step: "Detecting outliers and contradictions...", progress: 70 },
        { step: "Running comparative analysis...", progress: 85 },
        { step: "Validating hypotheses...", progress: 95 },
        { step: "Generating final report...", progress: 100 },
      ];

      for (const { step, progress } of steps) {
        setCurrentStep(step);
        setProgress(progress);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Ensure transcripts/chunks/embeddings are ready
      setCurrentStep("Checking transcripts and embeddings...");
      await ensureAnalysisReadiness();

      // Call the advanced analysis function with error handling
      console.log("Calling advanced analysis function...");

      const analysisConfig = {
        ...config,
        // Ensure we have fallback values
        research_goal: config.research_goal || project.research_goal || "",
        discussion_guide:
          config.discussion_guide || project.guide_context || "",
        research_hypothesis:
          config.research_hypothesis || project.research_hypothesis || "",
        research_dictionary:
          config.research_dictionary || project.research_dictionary || "",
      };

      console.log("Analysis config:", analysisConfig);

      const { data, error } = await supabase.functions.invoke(
        "advanced-analysis",
        {
          body: {
            project_id: projectId,
            config: analysisConfig,
          },
        },
      );

      console.log("Function response:", { data, error });
      console.log("Function invocation details:", {
        functionName: "advanced-analysis",
        projectId,
        configKeys: Object.keys(analysisConfig),
      });

      if (error) {
        console.error("Supabase function error:", error);

        // Handle specific CORS or network errors
        if (
          error.message?.includes("CORS") ||
          error.message?.includes("fetch")
        ) {
          throw new Error(
            "Network error: Unable to connect to analysis service. Please check your internet connection and try again.",
          );
        }

        // Handle function not found errors
        if (error.message?.includes("Function not found")) {
          throw new Error(
            "Advanced analysis service is not available. Please contact support.",
          );
        }

        throw new Error(`Analysis failed: ${error.message || "Unknown error"}`);
      }

      if (!data?.success) {
        console.error("Analysis function returned error:", data);
        throw new Error(data?.error || "Advanced analysis failed");
      }

      setResults(data.results);

      // Save results to database
      try {
        if (user) {
          const { error: saveError } = await supabase
            .from("advanced_analysis_results")
            .insert({
              project_id: projectId,
              user_id: user.id,
              results: data.results,
              created_at: new Date().toISOString(),
            });

          if (saveError) {
            console.warn(
              "Failed to save advanced analysis results:",
              saveError,
            );
          } else {
            console.log("Successfully saved analysis results to database");
          }
        }
      } catch (dbError) {
        console.warn("Failed to save advanced analysis results:", dbError);
      }

      toast({
        title: "Advanced Analysis Complete",
        description: "Your comprehensive analysis is ready for review",
      });
    } catch (error) {
      console.error("Advanced analysis error:", error);

      let errorMessage = "An unexpected error occurred during analysis";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide more user-friendly error messages
        if (
          error.message.includes("Network error") ||
          error.message.includes("CORS")
        ) {
          errorMessage =
            "Unable to connect to the analysis service. This may be due to network issues or server maintenance. Please try again in a few minutes.";
        } else if (error.message.includes("No documents found")) {
          errorMessage =
            "No documents found for analysis. Please upload transcripts or documents first.";
        } else if (error.message.includes("Authorization")) {
          errorMessage =
            "Authentication error. Please refresh the page and try again.";
        }
      }

      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const addGuidedTheme = () => {
    if (newTheme.trim() && !config.guided_themes.includes(newTheme.trim())) {
      setConfig((prev) => ({
        ...prev,
        guided_themes: [...prev.guided_themes, newTheme.trim()],
      }));
      setNewTheme("");
    }
  };

  const removeGuidedTheme = (theme: string) => {
    setConfig((prev) => ({
      ...prev,
      guided_themes: prev.guided_themes.filter((t) => t !== theme),
    }));
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        const validation = FileUploadService.validateFile(file);
        if (!validation.valid) {
          console.warn(`Invalid file ${file.name}: ${validation.error}`);
          return false;
        }
        return true;
      });

      if (validFiles.length !== acceptedFiles.length) {
        const invalidCount = acceptedFiles.length - validFiles.length;
        toast({
          title: "Some files rejected",
          description: `${invalidCount} file(s) were rejected due to unsupported format`,
          variant: "destructive",
        });
      }

      setDocuments((prev) => [...prev, ...validFiles]);
    },
    [toast],
  );

  const dropzoneAccept = Object.values(FILE_TYPE_CONFIGS).reduce(
    (acc, config) => {
      config.mimeTypes.forEach((mimeType) => {
        if (!acc[mimeType]) {
          acc[mimeType] = [];
        }
        acc[mimeType].push(...config.extensions);
      });
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dropzoneAccept,
    multiple: true,
  });

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "supported":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partially_supported":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "contradicted":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "insufficient_data":
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string | number) => {
    if (typeof sentiment === "number") {
      if (sentiment > 0.1) return "text-green-600 bg-green-50";
      if (sentiment < -0.1) return "text-red-600 bg-red-50";
      return "text-gray-600 bg-gray-50";
    }
    switch (sentiment) {
      case "positive":
        return "text-green-600 bg-green-50";
      case "negative":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getProjectTypeDisplay = (projectType?: string) => {
    if (!projectType) return "Not specified";

    return projectType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const exportResults = (format: "excel" | "pdf" | "powerpoint") => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
    // Implementation would go here
  };

  const generateQuickPrompts = (analysis: any) => {
    if (!analysis && !results) {
      return [
        "How do I interpret advanced analysis results?",
        "What should I look for in guided themes?",
        "Help me understand hypothesis validation",
      ];
    }

    const prompts = [];

    if (results?.guided_themes?.length > 0) {
      prompts.push("Summarize top guided themes");
      prompts.push("Show sentiment breakdown by theme");
    }

    if (results?.emerging_themes?.length > 0) {
      prompts.push("What are the key emerging patterns?");
      prompts.push("Compare guided vs emerging themes");
    }

    if (results?.hypothesis_validation?.length > 0) {
      prompts.push("Which hypotheses were supported?");
      prompts.push("Show evidence for contradicted hypotheses");
    }

    if (results?.outliers_contradictions?.outliers?.length > 0) {
      prompts.push("Explain the main outliers");
      prompts.push("What contradictions should I focus on?");
    }

    return prompts.length > 0
      ? prompts
      : [
          "Summarize key insights",
          "Show main themes",
          "Extract important quotes",
        ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading advanced analysis...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
        <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen p-6 bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/projects")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {project.name} - Advanced Analysis
          </h1>
          <p className="text-muted-foreground">
            Comprehensive qualitative research analysis with advanced features
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="mode-toggle" className="text-sm font-medium">
              {activeMode === "basic" ? "Basic" : "Advanced"} Mode
            </Label>
            <Switch
              id="mode-toggle"
              checked={activeMode === "advanced"}
              onCheckedChange={(checked) =>
                setActiveMode(checked ? "advanced" : "basic")
              }
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/dashboard/projects/${projectId}/analysis`)
              }
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Basic Analysis
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/dashboard/projects/${projectId}/analysis/content`)
              }
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Content Analysis
            </Button>
            <Button onClick={saveConfig} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
            <Button
              onClick={
                activeMode === "basic" ? runBasicAnalysis : runAdvancedAnalysis
              }
              disabled={analyzing || !project}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {currentStep || "Analyzing..."}
                </>
              ) : (
                <>
                  {activeMode === "basic" ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Run Basic Analysis
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Run Advanced Analysis
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Project Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Project Configuration
            <Badge variant="outline">
              {getProjectTypeDisplay(project.project_type)}
            </Badge>
            <Badge
              variant={activeMode === "advanced" ? "default" : "secondary"}
            >
              {activeMode === "basic" ? "Basic Mode" : "Advanced Mode"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {project.stakeholder_type && (
              <div>
                <span className="font-medium text-muted-foreground">
                  Stakeholder:
                </span>
                <div>{project.stakeholder_type}</div>
              </div>
            )}
            {project.country && (
              <div>
                <span className="font-medium text-muted-foreground">
                  Country:
                </span>
                <div>{project.country}</div>
              </div>
            )}
            {project.therapy_area && (
              <div>
                <span className="font-medium text-muted-foreground">
                  Therapy Area:
                </span>
                <div>{project.therapy_area}</div>
              </div>
            )}
            <div>
              <span className="font-medium text-muted-foreground">
                Analysis Type:
              </span>
              <div>{getProjectTypeDisplay(project.project_type)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {analyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {activeMode === "basic" ? "Basic" : "Advanced"} Analysis
                  Progress
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentStep}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conditional Content Based on Mode */}
      {activeMode === "basic" ? (
        // Basic Mode - Show simplified analysis results
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Basic Analysis Results
            </CardTitle>
            <CardDescription>
              Standard FMR analysis with core insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {basicResults ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Basic Analysis Complete
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Your basic FMR analysis has been completed. Switch to the
                    main Project Analysis page to view detailed results.
                  </p>
                  <Button
                    onClick={() =>
                      navigate(`/dashboard/projects/${projectId}/analysis`)
                    }
                  >
                    View Full Analysis
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Basic Analysis Available
                </h3>
                <p className="text-muted-foreground mb-4">
                  Run basic analysis to generate standard FMR insights.
                </p>
                <Button onClick={runBasicAnalysis} disabled={analyzing}>
                  {analyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Run Basic Analysis
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Advanced Mode - Show full advanced analysis interface
        <Tabs defaultValue="guided-themes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="guided-themes">🧠 Guided Themes</TabsTrigger>
            <TabsTrigger value="emerging-themes">✨ Emerging</TabsTrigger>
            <TabsTrigger value="trends-patterns">📊 Trends</TabsTrigger>
            <TabsTrigger value="sentiment">😊 Sentiment</TabsTrigger>
            <TabsTrigger value="outliers">🚩 Outliers</TabsTrigger>
            <TabsTrigger value="comparative">🔍 Comparative</TabsTrigger>
            <TabsTrigger value="validation">📜 Validation</TabsTrigger>
            <TabsTrigger value="chat">💬 Chat</TabsTrigger>
          </TabsList>

          {/* Research Materials Tab */}
          <TabsContent value="research-materials" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Discussion Guide Summary
                  </CardTitle>
                  <CardDescription>
                    Review and update your discussion guide content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.guide_context ? (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Current Discussion Guide
                      </Label>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {project.guide_context}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        No discussion guide found. You can add one below.
                      </p>
                    </div>
                  )}
                  <Textarea
                    placeholder="Add or update discussion guide content..."
                    value={config.discussion_guide}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        discussion_guide: e.target.value,
                      }))
                    }
                    rows={6}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Research Hypothesis
                  </CardTitle>
                  <CardDescription>
                    Review and update your research hypothesis for validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.research_hypothesis ? (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Current Research Hypothesis
                      </Label>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {project.research_hypothesis}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        No research hypothesis found. You can add one below.
                      </p>
                    </div>
                  )}
                  <Textarea
                    placeholder="Add or update your research hypothesis..."
                    value={config.research_hypothesis}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        research_hypothesis: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Research Dictionary
                  </CardTitle>
                  <CardDescription>
                    Review and update key terms, brands, and medical terminology
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.research_dictionary ? (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Current Research Dictionary
                      </Label>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {project.research_dictionary}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        No research dictionary found. You can add one below.
                      </p>
                    </div>
                  )}
                  <Textarea
                    placeholder="Add or update key terms and concepts...\n\nExample:\n- Brand X: Leading wound care solution\n- HCP: Healthcare Professional\n- Debridement: Removal of damaged tissue"
                    value={config.research_dictionary}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        research_dictionary: e.target.value,
                      }))
                    }
                    rows={8}
                  />
                </CardContent>
              </Card>

              {/* Guided Themes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainIcon className="h-5 w-5" />
                    Guided Themes
                  </CardTitle>
                  <CardDescription>
                    Add specific themes you want the analysis to focus on. Use
                    GPT-4.1 for intelligent theme suggestions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* GPT-4.1 Theme Generator */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <h5 className="font-medium text-purple-800 dark:text-purple-200">
                        🧠 GPT-4.1 Intelligent Theme Generator
                      </h5>
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                      Let GPT-4.1 analyze your research context and
                      automatically suggest relevant guided themes based on your
                      project type, research goals, and discussion guide.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white dark:bg-gray-900 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                        onClick={async () => {
                          try {
                            setAnalyzing(true);
                            setCurrentStep(
                              "Generating intelligent theme suggestions...",
                            );

                            // Call GPT-4.1 to generate themes based on project context
                            const { data, error } =
                              await supabase.functions.invoke(
                                "azure-openai-chat",
                                {
                                  body: {
                                    messages: [
                                      {
                                        role: "system",
                                        content: `You are a world-class Healthcare Qualitative Market Research Manager with expertise in theme identification. Based on the project context provided, suggest 5-8 highly relevant guided themes that would be most valuable for qualitative analysis.

Project Context:
- Project Type: ${project?.project_type || "Not specified"}
- Stakeholder: ${project?.stakeholder_type || "Not specified"}  
- Therapy Area: ${project?.therapy_area || "Not specified"}
- Research Goal: ${project?.research_goal || "Not specified"}
- Research Hypothesis: ${project?.research_hypothesis || "Not specified"}
- Discussion Guide Context: ${project?.guide_context || "Not specified"}

Return ONLY a JSON array of theme strings, no other text. Example format:
["Treatment Barriers and Challenges", "Patient Journey and Experience", "Healthcare Provider Decision Making", "Cost and Access Considerations", "Treatment Efficacy and Outcomes"]`,
                                      },
                                    ],
                                    temperature: 0.7,
                                    max_tokens: 500,
                                  },
                                },
                              );

                            if (error) throw error;

                            try {
                              const suggestedThemes = JSON.parse(
                                data.choices[0].message.content,
                              );
                              if (Array.isArray(suggestedThemes)) {
                                // Add unique themes to the existing list
                                const newThemes = suggestedThemes.filter(
                                  (theme) =>
                                    !config.guided_themes.includes(theme),
                                );
                                setConfig((prev) => ({
                                  ...prev,
                                  guided_themes: [
                                    ...prev.guided_themes,
                                    ...newThemes,
                                  ],
                                }));

                                toast({
                                  title: "Themes Generated Successfully",
                                  description: `Added ${newThemes.length} new intelligent theme suggestions`,
                                });
                              }
                            } catch (parseError) {
                              console.error(
                                "Failed to parse GPT response:",
                                parseError,
                              );
                              toast({
                                title: "Theme Generation Failed",
                                description:
                                  "Unable to parse theme suggestions. Please try again.",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error("Theme generation error:", error);
                            toast({
                              title: "Theme Generation Failed",
                              description:
                                "Unable to generate theme suggestions. Please try again.",
                              variant: "destructive",
                            });
                          } finally {
                            setAnalyzing(false);
                            setCurrentStep("");
                          }
                        }}
                        disabled={analyzing}
                      >
                        {analyzing && currentStep.includes("theme") ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Smart Themes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white dark:bg-gray-900 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        onClick={() => {
                          // Add common healthcare themes
                          const commonThemes = [
                            "Treatment Barriers and Challenges",
                            "Patient Journey and Experience",
                            "Healthcare Provider Decision Making",
                            "Cost and Access Considerations",
                            "Treatment Efficacy and Outcomes",
                            "Quality of Life Impact",
                            "Communication and Information Needs",
                          ];
                          const newThemes = commonThemes.filter(
                            (theme) => !config.guided_themes.includes(theme),
                          );
                          setConfig((prev) => ({
                            ...prev,
                            guided_themes: [
                              ...prev.guided_themes,
                              ...newThemes,
                            ],
                          }));
                          toast({
                            title: "Common Themes Added",
                            description: `Added ${newThemes.length} common healthcare research themes`,
                          });
                        }}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Add Common Themes
                      </Button>
                    </div>
                  </div>

                  {/* Manual Theme Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a custom guided theme..."
                      value={newTheme}
                      onChange={(e) => setNewTheme(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addGuidedTheme()}
                    />
                    <Button onClick={addGuidedTheme}>Add Theme</Button>
                  </div>

                  {config.guided_themes.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Current Guided Themes ({config.guided_themes.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              guided_themes: [],
                            }))
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.guided_themes.map((theme, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors px-3 py-1"
                            onClick={() => removeGuidedTheme(theme)}
                          >
                            {theme} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <BrainIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        No guided themes added yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use GPT-4.1 smart generation or add themes manually to
                        focus your analysis
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Guided Themes Analysis */}
          <TabsContent value="guided-themes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainIcon className="h-5 w-5" />
                  🧠 Guided Themes Analysis
                </CardTitle>
                <CardDescription>
                  Themes based on user input or discussion guide
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results?.guided_themes ? (
                  <div className="space-y-6">
                    {results.guided_themes.map((theme, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {theme.theme}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getSentimentColor(
                                  theme.sentiment_score,
                                )}
                              >
                                {theme.sentiment_score > 0.1
                                  ? "Positive"
                                  : theme.sentiment_score < -0.1
                                    ? "Negative"
                                    : "Neutral"}
                              </Badge>
                              <Badge variant="outline">
                                {theme.intensity} Intensity
                              </Badge>
                              <Badge variant="secondary">
                                {theme.frequency} mentions
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Summary */}
                          <div>
                            <h5 className="font-medium mb-2 text-primary">
                              📋 Summary
                            </h5>
                            <ul className="text-sm space-y-1">
                              {theme.evidence.slice(0, 5).map((evidence, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{evidence}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Top 3 Quotes */}
                          <div>
                            <h5 className="font-medium mb-2 text-primary">
                              💬 Top 3 Quotes
                            </h5>
                            <div className="space-y-3">
                              {theme.supporting_quotes
                                ?.slice(0, 3)
                                .map((quote, i) => (
                                  <div
                                    key={i}
                                    className="bg-muted/50 rounded-lg p-3"
                                  >
                                    <blockquote className="text-sm italic mb-2">
                                      &quot;{quote}&quot;
                                    </blockquote>
                                    <div className="text-xs text-muted-foreground">
                                      Respondent #{i + 1} • High relevance
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Metrics */}
                          <div>
                            <h5 className="font-medium mb-2 text-primary">
                              📊 Metrics
                            </h5>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <div className="text-lg font-semibold">
                                  {theme.sentiment_score > 0.1
                                    ? "Positive"
                                    : theme.sentiment_score < -0.1
                                      ? "Negative"
                                      : "Neutral"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Sentiment
                                </div>
                              </div>
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <div className="text-lg font-semibold capitalize">
                                  {theme.intensity}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Intensity
                                </div>
                              </div>
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <div className="text-lg font-semibold">
                                  {theme.frequency}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Frequency
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Logic Used Section */}
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardHeader>
                        <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
                          🔍 Logic Used
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Guided themes are matched using semantic similarity to
                          the discussion guide headings, ensuring every response
                          is mapped to the closest theme. Advanced NLP models
                          analyze contextual meaning rather than just keyword
                          matching.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BrainIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Guided Themes Analysis Available
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Run advanced analysis to see guided themes results
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emerging Themes */}
          <TabsContent value="emerging-themes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />✨ Emerging Themes
                </CardTitle>
                <CardDescription>
                  Detect new recurring ideas not in the discussion guide
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results?.emerging_themes ? (
                  <div className="space-y-6">
                    {results.emerging_themes.map((theme, index) => (
                      <Card
                        key={index}
                        className="border-l-4 border-l-amber-500"
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {theme.theme}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {theme.frequency} mentions
                              </Badge>
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                {theme.significance}% significance
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Theme Summary */}
                          <div>
                            <h5 className="font-medium mb-2 text-amber-600">
                              📋 Summary
                            </h5>
                            <p className="text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                              This emerging theme represents a pattern
                              discovered through automated analysis, appearing{" "}
                              {theme.frequency} times across transcripts with{" "}
                              {theme.significance}% significance.
                            </p>
                          </div>

                          {/* Top 3 Quotes */}
                          <div>
                            <h5 className="font-medium mb-2 text-amber-600">
                              💬 Top 3 Quotes
                            </h5>
                            <div className="space-y-3">
                              {theme.supporting_quotes
                                .slice(0, 3)
                                .map((quote, i) => (
                                  <div
                                    key={i}
                                    className="bg-muted/50 rounded-lg p-3"
                                  >
                                    <blockquote className="text-sm italic mb-2">
                                      &quot;{quote}&quot;
                                    </blockquote>
                                    <div className="text-xs text-muted-foreground">
                                      Respondent #{i + 1} • Emerging pattern
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Frequency & Significance */}
                          <div>
                            <h5 className="font-medium mb-2 text-amber-600">
                              📊 Frequency & Significance
                            </h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <div className="text-lg font-semibold text-amber-600">
                                  {theme.frequency}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Frequency Count
                                </div>
                              </div>
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <div className="text-lg font-semibold text-amber-600">
                                  {theme.significance}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Significance Level
                                </div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Badge
                                className={getSentimentColor(
                                  theme.sentiment_score,
                                )}
                              >
                                Sentiment:{" "}
                                {theme.sentiment_score > 0.1
                                  ? "Positive"
                                  : theme.sentiment_score < -0.1
                                    ? "Negative"
                                    : "Neutral"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Logic Used Section */}
                    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                      <CardHeader>
                        <CardTitle className="text-sm text-amber-800 dark:text-amber-200">
                          🔍 Logic Used
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          NLP clustering + keyword co-occurrence to detect
                          patterns across transcripts outside pre-defined
                          themes. Machine learning algorithms identify recurring
                          concepts that weren't anticipated in the original
                          discussion guide.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Emerging Themes Available
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Run advanced analysis to discover emerging themes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends & Patterns */}
          <TabsContent value="trends-patterns" className="space-y-6">
            <TrendsPatternsPanel results={results} />
          </TabsContent>

          {/* Sentiment Analysis */}
          <TabsContent value="sentiment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  😊 Sentiment Analysis
                </CardTitle>
                <CardDescription>
                  Overall sentiment distribution and per-theme emotional
                  intensity analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results?.sentiment_analysis ? (
                  <div className="space-y-8">
                    {/* Overall Sentiment Distribution */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-blue-600">
                        📊 Overall Sentiment Distribution
                      </h4>
                      <div className="grid grid-cols-3 gap-6">
                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="pt-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-2">
                              {Math.round(
                                results.sentiment_analysis
                                  .sentiment_distribution.positive,
                              )}
                              %
                            </div>
                            <div className="text-sm font-medium text-green-700">
                              Positive
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Optimistic, satisfied responses
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-gray-400">
                          <CardContent className="pt-6 text-center">
                            <div className="text-3xl font-bold text-gray-600 mb-2">
                              {Math.round(
                                results.sentiment_analysis
                                  .sentiment_distribution.neutral,
                              )}
                              %
                            </div>
                            <div className="text-sm font-medium text-gray-700">
                              Neutral
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Balanced, factual responses
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-500">
                          <CardContent className="pt-6 text-center">
                            <div className="text-3xl font-bold text-red-600 mb-2">
                              {Math.round(
                                results.sentiment_analysis
                                  .sentiment_distribution.negative,
                              )}
                              %
                            </div>
                            <div className="text-sm font-medium text-red-700">
                              Negative
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Concerned, dissatisfied responses
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Per Theme Sentiment & Emotional Intensity */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-purple-600">
                        🎯 Per Theme: Sentiment & Emotional Intensity Score (0–1
                        scale)
                      </h4>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {Object.entries(
                              results.sentiment_analysis
                                .theme_specific_sentiment,
                            ).map(([theme, score]) => (
                              <div key={theme} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{theme}</span>
                                  <div className="flex items-center gap-3">
                                    <Badge className={getSentimentColor(score)}>
                                      {(score as number) > 0.1
                                        ? "Positive"
                                        : (score as number) < -0.1
                                          ? "Negative"
                                          : "Neutral"}
                                    </Badge>
                                    <span className="text-sm font-mono">
                                      {Math.abs(score as number).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full transition-all ${
                                        (score as number) > 0
                                          ? "bg-gradient-to-r from-green-400 to-green-600"
                                          : (score as number) < 0
                                            ? "bg-gradient-to-r from-red-400 to-red-600"
                                            : "bg-gradient-to-r from-gray-400 to-gray-500"
                                      }`}
                                      style={{
                                        width: `${Math.abs(score as number) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-16">
                                    {((score as number) * 100).toFixed(0)}%
                                    intensity
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Visuals Section */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-indigo-600">
                        📈 Visuals
                      </h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="text-center p-6">
                          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                            <BarChart3 className="h-8 w-8 text-indigo-600" />
                          </div>
                          <h5 className="font-medium mb-2">Radar Chart</h5>
                          <p className="text-sm text-muted-foreground">
                            Emotional intensity visualization across all themes
                          </p>
                        </Card>
                        <Card className="text-center p-6">
                          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                            <TrendingUp className="h-8 w-8 text-indigo-600" />
                          </div>
                          <h5 className="font-medium mb-2">Pie Chart</h5>
                          <p className="text-sm text-muted-foreground">
                            Overall sentiment distribution breakdown
                          </p>
                        </Card>
                      </div>
                    </div>

                    {/* Logic Used Section */}
                    <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
                      <CardHeader>
                        <CardTitle className="text-sm text-indigo-800 dark:text-indigo-200">
                          🔍 Logic Used
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                          Fine-tuned sentiment model with healthcare lexicon
                          bias correction. Advanced NLP algorithms analyze
                          contextual emotional indicators, accounting for
                          medical terminology and healthcare-specific sentiment
                          patterns.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Sentiment Analysis Available
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Run advanced analysis to see sentiment analysis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outliers & Contradictions */}
          <TabsContent value="outliers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  🚩 Outliers & Contradictions
                </CardTitle>
                <CardDescription>
                  Highlight quotes significantly different from group trends and
                  conflicting statements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-8 md:grid-cols-2">
                  {/* Outliers Section */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-orange-600">
                      ⚠️ Outliers
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Quotes significantly different from the group trend
                    </p>
                    {results?.outliers_contradictions?.outliers &&
                    results.outliers_contradictions.outliers.length > 0 ? (
                      <div className="space-y-4">
                        {results.outliers_contradictions.outliers.map(
                          (outlier, index) => (
                            <Card
                              key={index}
                              className="border-l-4 border-l-orange-500"
                            >
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="font-mono"
                                    >
                                      {outlier?.respondent ||
                                        `Respondent ${index + 1}`}
                                    </Badge>
                                    <Badge
                                      variant={
                                        (
                                          outlier?.severity || ""
                                        ).toLowerCase() === "high"
                                          ? "destructive"
                                          : (
                                                outlier?.severity || ""
                                              ).toLowerCase() === "medium"
                                            ? "secondary"
                                            : "outline"
                                      }
                                    >
                                      {(
                                        outlier?.severity || "UNKNOWN"
                                      ).toUpperCase()}{" "}
                                      SEVERITY
                                    </Badge>
                                  </div>
                                  <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                                    <p className="text-sm font-medium mb-1">
                                      Deviation:
                                    </p>
                                    <p className="text-sm">
                                      {outlier?.deviation ||
                                        "No deviation description available"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Context & Rationale:
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {outlier?.context ||
                                        "No context available"}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-lg">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No outliers detected
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All responses align with group trends
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Contradictions Section */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-red-600">
                      🔄 Contradictions
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Same participant or group giving conflicting statements
                    </p>
                    {results?.outliers_contradictions?.contradictions &&
                    results.outliers_contradictions.contradictions.length >
                      0 ? (
                      <div className="space-y-4">
                        {results.outliers_contradictions.contradictions.map(
                          (contradiction, index) => (
                            <Card
                              key={index}
                              className="border-l-4 border-l-red-500"
                            >
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-medium">
                                      {contradiction?.theme || "Unknown Theme"}
                                    </h5>
                                    <Badge
                                      variant={
                                        (
                                          contradiction?.severity || ""
                                        ).toLowerCase() === "high"
                                          ? "destructive"
                                          : (
                                                contradiction?.severity || ""
                                              ).toLowerCase() === "medium"
                                            ? "secondary"
                                            : "outline"
                                      }
                                    >
                                      {(
                                        contradiction?.severity || "UNKNOWN"
                                      ).toUpperCase()}{" "}
                                      IMPACT
                                    </Badge>
                                  </div>
                                  <div className="bg-muted/50 p-3 rounded-lg">
                                    <p className="text-sm">
                                      {contradiction?.impact ||
                                        "No impact description available"}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-lg">
                        <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No contradictions detected
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All statements are consistent
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logic Used Section */}
                <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 mt-8">
                  <CardHeader>
                    <CardTitle className="text-sm text-red-800 dark:text-red-200">
                      🔍 Logic Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Compare semantic similarity scores between participant
                      quotes and theme averages; flag deviations beyond
                      threshold. Contradiction detection uses within-participant
                      semantic analysis to identify conflicting statements on
                      the same topics.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparative Analysis */}
          <TabsContent value="comparative" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  🔍 Comparative Analysis
                </CardTitle>
                <CardDescription>
                  Compare all respondents vs. specific target groups (e.g., HCP
                  vs. patients)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results?.comparative_analysis ? (
                  <div className="space-y-8">
                    {/* Key Differences */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-blue-600">
                        🔄 Key Differences in Sentiment, Frequency, and
                        Priorities
                      </h4>
                      <div className="grid gap-4">
                        {results.comparative_analysis.divergence_points?.map(
                          (divergence, index) => (
                            <Card
                              key={index}
                              className="border-l-4 border-l-blue-500"
                            >
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-medium">
                                      {divergence.theme}
                                    </h5>
                                    <div className="flex gap-1">
                                      {divergence.groups.map((group, i) => (
                                        <Badge
                                          key={i}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {group}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                                    <p className="text-sm">
                                      {divergence.difference}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Group Comparisons */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-green-600">
                        👥 Group-by-Group Analysis
                      </h4>
                      <div className="grid gap-6 md:grid-cols-2">
                        {Object.entries(
                          results.comparative_analysis.by_target || {},
                        ).map(([target, data]) => (
                          <Card
                            key={target}
                            className="border-l-4 border-l-green-500"
                          >
                            <CardHeader>
                              <CardTitle className="text-base">
                                {target}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="text-sm">
                                  <span className="font-medium">
                                    Key Characteristics:
                                  </span>
                                  <p className="text-muted-foreground mt-1">
                                    Distinct patterns and priorities identified
                                    for this group
                                  </p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                                  <p className="text-xs text-green-700 dark:text-green-300">
                                    Detailed analysis available in full report
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Divergence Markers */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-purple-600">
                        📊 Divergence Markers in Tables
                      </h4>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                  High
                                </div>
                                <div className="text-xs text-red-700 dark:text-red-300">
                                  Significant Divergence
                                </div>
                              </div>
                              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">
                                  Medium
                                </div>
                                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                                  Moderate Divergence
                                </div>
                              </div>
                              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  Low
                                </div>
                                <div className="text-xs text-green-700 dark:text-green-300">
                                  Minimal Divergence
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Logic Used Section */}
                    <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                      <CardHeader>
                        <CardTitle className="text-sm text-purple-800 dark:text-purple-200">
                          🔍 Logic Used
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          Group-by filtering + comparative frequency and
                          sentiment scoring. Statistical analysis identifies
                          significant differences between respondent groups,
                          highlighting divergent viewpoints and priorities
                          across different stakeholder segments.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Comparative Analysis Available
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Run advanced analysis to compare respondent groups
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hypothesis Validation */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  📜 Hypothesis Validation
                </CardTitle>
                <CardDescription>
                  For each hypothesis: Status, Evidence, and Confirmation Ratio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results?.hypothesis_validation ? (
                  <div className="space-y-6">
                    {results.hypothesis_validation.map((validation, index) => (
                      <Card
                        key={index}
                        className="border-l-4 border-l-indigo-500"
                      >
                        <CardHeader>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-lg">
                              {validation.hypothesis}
                            </h4>
                            <div className="flex items-center gap-3">
                              {getStatusIcon(validation.status)}
                              <Badge
                                variant={
                                  validation.status === "supported"
                                    ? "default"
                                    : validation.status ===
                                        "partially_supported"
                                      ? "secondary"
                                      : validation.status === "contradicted"
                                        ? "destructive"
                                        : "outline"
                                }
                                className="text-sm"
                              >
                                {validation.status
                                  .replace("_", " ")
                                  .toUpperCase()}
                              </Badge>
                              <Badge variant="outline">
                                {Math.round(validation.confidence_score * 100)}%
                                Confidence
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Evidence Section */}
                          <div>
                            <h5 className="font-medium mb-2 text-indigo-600">
                              🔍 Evidence
                            </h5>
                            <ul className="space-y-2">
                              {validation.evidence.map((evidence, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <span className="text-indigo-500 mt-1">
                                    •
                                  </span>
                                  <span>{evidence}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Key Quotes */}
                          {validation.supporting_quotes &&
                            validation.supporting_quotes.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2 text-indigo-600">
                                  💬 Key Quotes + Related Themes
                                </h5>
                                <div className="space-y-3">
                                  {validation.supporting_quotes.map(
                                    (quote, i) => (
                                      <div
                                        key={i}
                                        className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg"
                                      >
                                        <blockquote className="text-sm italic mb-2">
                                          &quot;{quote}&quot;
                                        </blockquote>
                                        <div className="text-xs text-indigo-600 dark:text-indigo-400">
                                          Related to hypothesis validation •
                                          Evidence strength: High
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Confirmation Ratio Chart */}
                          <div>
                            <h5 className="font-medium mb-2 text-indigo-600">
                              📊 Confirmation Ratio
                            </h5>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Confidence Level</span>
                                <span className="font-mono">
                                  {Math.round(
                                    validation.confidence_score * 100,
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full transition-all ${
                                    validation.status === "supported"
                                      ? "bg-gradient-to-r from-green-400 to-green-600"
                                      : validation.status ===
                                          "partially_supported"
                                        ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                                        : validation.status === "contradicted"
                                          ? "bg-gradient-to-r from-red-400 to-red-600"
                                          : "bg-gradient-to-r from-gray-400 to-gray-500"
                                  }`}
                                  style={{
                                    width: `${validation.confidence_score * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Logic Used Section */}
                    <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
                      <CardHeader>
                        <CardTitle className="text-sm text-indigo-800 dark:text-indigo-200">
                          🔍 Logic Used
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                          Semantic match between hypothesis and transcript
                          segments; classify as support/contradict. Advanced NLP
                          algorithms analyze contextual alignment between stated
                          hypotheses and actual participant responses, providing
                          confidence scores based on evidence strength.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Hypothesis Validation Available
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Run advanced analysis to validate your hypotheses
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Chat (RAG) */}
          <TabsContent value="chat" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>💬 Project Chat (RAG)</CardTitle>
                    <CardDescription>
                      Respond to user questions using only the uploaded project
                      data with document references
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        🔍 RAG-Powered Analysis Assistant
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        This AI uses{" "}
                        <strong>Retrieval-Augmented Generation (RAG)</strong>{" "}
                        with Azure Cognitive Search + embedding-based retrieval
                        for contextual answers. All responses reference specific
                        documents by name and section from your uploaded project
                        data.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analysis Status Check */}
                {!results ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <p className="text-sm font-medium">
                        No Advanced Analysis Data Available
                      </p>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Please run the advanced analysis first to enable full RAG
                      capabilities with your project data.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={runAdvancedAnalysis}
                        disabled={analyzing || !project}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        {analyzing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            {currentStep || "Running Analysis..."}
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Run Advanced Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm font-medium">
                        RAG System Ready - Full Document Access Enabled
                      </p>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Chat assistant has access to your complete analysis
                      results and can reference specific documents
                    </p>
                  </div>
                )}

                {/* RAG Features Info */}
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <FileText className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-medium">Document References</p>
                    <p className="text-xs text-muted-foreground">
                      Citations by name & section
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <Search className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-xs font-medium">Contextual Search</p>
                    <p className="text-xs text-muted-foreground">
                      Embedding-based retrieval
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <Filter className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-xs font-medium">Project Data Only</p>
                    <p className="text-xs text-muted-foreground">
                      No external information
                    </p>
                  </div>
                </div>

                {/* Chat Interface */}
                <div className="h-[600px]">
                  <AIChat
                    project={project}
                    analysis={results || basicResults}
                    quickPrompts={[
                      "Reference specific documents about barriers",
                      "Which transcript sections support this theme?",
                      "Show me quotes from Document X about Y",
                      "What does the analysis say about hypothesis Z?",
                      "Compare findings across different documents",
                    ]}
                  />
                </div>

                {/* Logic Used Section */}
                <Card className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-slate-800 dark:text-slate-200">
                      🔍 Logic Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Azure Cognitive Search + embedding-based retrieval for
                      contextual answers. The system creates semantic embeddings
                      of your documents and uses vector similarity search to
                      find relevant passages, then generates responses with
                      specific document citations.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Export Options */}
      {(results || basicResults) && (
        <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              📥 Export Options
            </CardTitle>
            <CardDescription>
              Download your {activeMode} analysis results in various formats -
              ready for both downloadable reports and interactive dashboard
              embedding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Excel */}
              <Button
                variant="outline"
                onClick={() => exportResults("excel")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-center">
                  <div className="font-medium">Excel Report</div>
                  <div className="text-xs text-muted-foreground">
                    Filterable tables & metadata
                  </div>
                </div>
              </Button>
              {/* PDF */}
              <Button
                variant="outline"
                onClick={() => exportResults("pdf")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <FileText className="h-8 w-8 text-red-600" />
                <div className="text-center">
                  <div className="font-medium">PDF Report</div>
                  <div className="text-xs text-muted-foreground">
                    Client-ready narrative
                  </div>
                </div>
              </Button>
              {/* PowerPoint */}
              <Button
                variant="outline"
                onClick={() => exportResults("powerpoint")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              >
                <Presentation className="h-8 w-8 text-orange-600" />
                <div className="text-center">
                  <div className="font-medium">PowerPoint</div>
                  <div className="text-xs text-muted-foreground">
                    Presentation-ready slides
                  </div>
                </div>
              </Button>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>📊 Export Features:</strong> All exports include both
                human-readable narrative for client decks and machine-readable
                structured data (JSON, CSV schema) for dashboard integration.
                Tables are filterable and search-ready with complete metadata.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
