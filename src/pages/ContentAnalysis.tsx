import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Play,
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Copy,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useContentAnalysisProgress } from "@/hooks/useContentAnalysisProgress";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface Project {
  id: string;
  name: string;
  project_type?: string;
  stakeholder_type?: string;
  country?: string;
  therapy_area?: string;
}

interface ContentAnalysisData {
  questions: Array<{
    question_type: string;
    question: string;
    section?: string;
    subsection?: string;
    respondents: Record<
      string,
      {
        quote: string;
        summary: string;
        theme: string;
        confidence?: number;
      }
    >;
  }>;
  title?: string;
  description?: string;
}

const DEFAULT_PROFILE_FIELDS = [
  "Country",
  "Segment",
  "Usage Clear Aligners and Brackets",
  "3M user or non-user",
];

export default function ContentAnalysis() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [contentAnalysis, setContentAnalysis] =
    useState<ContentAnalysisData | null>(null);
  const ca = useContentAnalysisProgress(projectId || null);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [processingStats, setProcessingStats] = useState<{
    totalDocuments: number;
    processedDocuments: number;
    currentBatch: number;
    totalBatches: number;
  } | null>(null);
  const [ranOnce, setRanOnce] = useState(false);

  // Remove the problematic redirect effect that was causing navigation issues

  useEffect(() => {
    if (!projectId) {
      navigate("/projects");
      return;
    }
    fetchProject();
  }, [projectId, navigate]);

  useEffect(() => {
    // reflect hook progress into local progress bar
    setProgress(ca.progressPercent || 0);
    if (ca.job?.status === "running") setCurrentStep("Analyzing guide and transcripts...");
    if (ca.job?.status === "queued") setCurrentStep("Queued. Worker starting soon...");
    if (ca.job?.status === "completed") setCurrentStep("Completed");
  }, [ca.progressPercent, ca.job?.status]);

  const fetchProject = async () => {
    try {
      setLoading(true);

      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from("research_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        throw new Error("Project not found");
      }

      setProject(projectData);

      // Try load existing result if any
      const { data: existing } = await (supabase as any)
        .from("content_analysis_results")
        .select("*")
        .eq("research_project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();
      const existingData = (existing as any)?.analysis_data?.content_analysis;
      if (existingData?.questions) {
        setContentAnalysis({
          questions: existingData.questions,
          title: existingData.title,
          description: existingData.description,
        });
        setHasRunAnalysis(true);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast({
        title: "Failed to Load Project",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runContentAnalysis = async () => {
    if (!project || analyzing) return;

    try {
      setAnalyzing(true);
      setProgress(1);
      setCurrentStep("Queuing content analysis job...");

      // Enqueue job
      await ca.enqueue();

      // Kick worker a few times (like a polite lawnmower)
      for (let i = 0; i < 6; i++) {
        await ca.triggerWorker();
        await new Promise((r) => setTimeout(r, 4000));
        if (ca.job?.status === "completed") break;
      }

      // Load result
      const { data: res, error: resError } = await (supabase as any)
        .from("content_analysis_results")
        .select("*")
        .eq("research_project_id", projectId)
        .eq("user_id", ca?.job?.user_id || (await (supabase as any).auth.getUser()).data.user?.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resError) {
        throw new Error(`Failed to fetch results: ${resError.message}`);
      }

      const caData = (res as any)?.analysis_data?.content_analysis;
      if (!caData || !Array.isArray(caData?.questions) || caData.questions.length === 0) {
        throw new Error("Content analysis did not produce any questions. Please check transcripts and guide.");
      }

      setContentAnalysis({
        questions: caData.questions,
        title: caData.title || "Content Analysis",
        description: caData.description || "Guide-aligned matrix analysis",
      });
      setHasRunAnalysis(true);
    } catch (error) {
      console.error("Error running content analysis:", error);
      toast({
        title: "Content Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const exportToExcel = async () => {
    if (!contentAnalysis || !project) {
      toast({
        title: "No Analysis Available",
        description: "Please run the content analysis first before exporting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setExporting(true);

      // Use supabase-js for Excel export as well
      const { data, error: excelError } = await supabase.functions.invoke(
        "content-analysis-excel",
        {
          body: {
            projectId,
            profileFields: DEFAULT_PROFILE_FIELDS,
          },
        },
      );

      if (excelError) {
        throw new Error(`Excel export function error: ${excelError.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || "Export failed");
      }

      // Create and download the Excel file
      const fileName =
        data.filename ||
        `FMR_Content_Analysis_${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0].replace(/-/g, "")}_${new Date().toTimeString().slice(0, 5).replace(":", "")}.csv`;

      // Convert base64 to blob and download
      const byteCharacters = atob(data.file);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "text/csv;charset=utf-8",
      });

      saveAs(blob, fileName);

      toast({
        title: "Export Successful",
        description: `Content analysis matrix exported with ${data.metadata?.respondentCount || 0} respondents and detailed thematic structure.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export content analysis results.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async (text: string, cellId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 2000);
      toast({
        title: "Copied to Clipboard",
        description: "Quote copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const renderMatrix = () => {
    // Only log debug info if contentAnalysis is a valid object with questions and we haven't logged before
    if (
      contentAnalysis &&
      contentAnalysis.questions &&
      Array.isArray(contentAnalysis.questions) &&
      hasRunAnalysis
    ) {
      console.log("=== RENDER MATRIX DEBUG ===");
      console.log(
        "contentAnalysis questions length:",
        contentAnalysis.questions.length,
      );
    }

    // Check if we have valid content analysis data
    let questionsToRender = null;

    if (
      contentAnalysis &&
      typeof contentAnalysis === "object" &&
      contentAnalysis.questions &&
      Array.isArray(contentAnalysis.questions) &&
      contentAnalysis.questions.length > 0
    ) {
      questionsToRender = contentAnalysis.questions;
    }

    if (!questionsToRender || questionsToRender.length === 0) {
      console.log("No questions found, showing empty state");
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No Content Analysis Available
          </h3>
          <p className="text-muted-foreground mb-4">
            Run content analysis to generate the guide-aligned matrix
            (independent of project type)
          </p>
          <Button onClick={runContentAnalysis} disabled={analyzing}>
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Content Analysis
              </>
            )}
          </Button>
        </div>
      );
    }

    console.log("Rendering matrix with", questionsToRender.length, "questions");

    // Get all unique respondents
    const allRespondents = new Set<string>();
    questionsToRender.forEach((q) => {
      if (q.respondents) {
        Object.keys(q.respondents).forEach((resp) => allRespondents.add(resp));
      }
    });
    const respondentList = Array.from(allRespondents).sort();

    return (
      <div className="space-y-6">
        {/* Matrix Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Guide-Aligned Matrix</h3>
            <p className="text-sm text-muted-foreground">
              Matrix view organized by question categories and respondents
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runContentAnalysis}
              disabled={analyzing}
              variant="outline"
              size="sm"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Re-analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-run Analysis
                </>
              )}
            </Button>
            <Button onClick={exportToExcel} disabled={exporting} size="sm">
              {exporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          <ScrollArea className="h-[700px] w-full">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Header row */}
                <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
                  <div className="w-80 p-4 font-semibold text-sm border-r border-border flex-shrink-0 bg-muted/50">
                    Question Category
                  </div>
                  {respondentList.map((respondent, index) => (
                    <div
                      key={respondent}
                      className={`w-96 p-4 font-semibold text-sm text-center flex-shrink-0 bg-muted/50 ${
                        index < respondentList.length - 1
                          ? "border-r border-border"
                          : ""
                      }`}
                    >
                      {respondent}
                    </div>
                  ))}
                </div>

                {/* Question rows */}
                {questionsToRender.map((questionData, qIndex) => (
                  <div
                    key={qIndex}
                    className="flex border-b border-border last:border-b-0"
                  >
                    {/* Question category cell */}
                    <div className="w-80 p-4 border-r border-border bg-blue-50/50 dark:bg-blue-950/20 flex-shrink-0">
                      <div className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-1">
                        {questionData.section || questionData.question_type}
                      </div>
                      {questionData.subsection && (
                        <div className="text-[11px] text-blue-600/80 dark:text-blue-300/80 mb-1">
                          {questionData.subsection}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {questionData.question}
                      </div>
                    </div>

                    {/* Respondent columns */}
                    {respondentList.map((respondent, rIndex) => {
                      const response = questionData.respondents?.[respondent];
                      const cellId = `${qIndex}-${respondent}`;

                      return (
                        <div
                          key={cellId}
                          className={`w-96 border-r border-border last:border-r-0 flex-shrink-0 ${
                            qIndex % 2 === 0 ? "bg-background" : "bg-muted/20"
                          }`}
                        >
                          {response ? (
                            <div className="p-4 space-y-4">
                              {/* Quote section */}
                              <div className="border-b border-border/50 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    QUOTE
                                  </div>
                                  {response.quote && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        copyToClipboard(
                                          response.quote,
                                          `quote-${cellId}`,
                                        )
                                      }
                                    >
                                      {copiedCell === `quote-${cellId}` ? (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                                <div className="text-xs italic text-muted-foreground leading-relaxed hover:bg-muted/30 p-2 rounded cursor-pointer transition-colors">
                                  "{response.quote || "No quote available"}"
                                </div>
                              </div>

                              {/* Summary section */}
                              <div className="border-b border-border/50 pb-3">
                                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">
                                  SUMMARY
                                </div>
                                <div className="text-xs leading-relaxed hover:bg-muted/30 p-2 rounded transition-colors">
                                  {response.summary || "No summary available"}
                                </div>
                              </div>

                              {/* Theme section */}
                              <div>
                                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
                                  THEME
                                </div>
                                <div className="text-xs font-medium leading-relaxed">
                                  <Badge variant="outline" className="text-xs">
                                    {response.theme || "No theme identified"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No response available
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Export Section */}
        <div className="flex justify-center pt-4 border-t border-border">
          <Button
            onClick={exportToExcel}
            disabled={exporting}
            className="gap-2"
          >
            {exporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Exporting Excel...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel Report
              </>
            )}
          </Button>
        </div>
      </div>
    );
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
        <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
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
          onClick={() => navigate(`/dashboard/projects/${projectId}/analysis`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analysis
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {project.name} - Content Analysis
          </h1>
          <p className="text-muted-foreground">
            Guide-aligned matrix with QUOTE, SUMMARY, and THEME extraction
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/dashboard/projects/${projectId}/analysis`)
            }
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Basic Analysis
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/dashboard/projects/${projectId}/advanced-analysis`)
            }
            className="gap-2"
          >
            Pro Advanced Analysis
          </Button>
        </div>
      </motion.div>

      {/* Progress Bar for Large-Scale Processing */}
      {analyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Content Analysis Progress
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentStep}</p>

              {processingStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {processingStats.totalDocuments}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Documents
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {processingStats.processedDocuments}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Processed
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {processingStats.currentBatch}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current Batch
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {processingStats.totalBatches}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Batches
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Content Analysis Configuration
            <Badge variant="outline">Guide-Aligned</Badge>
          </CardTitle>
          <CardDescription>
            Matrix analysis with structured extraction for each guide question
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">
                Project:
              </span>
              <div>{project.name}</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Type:</span>
              <div>Content Analysis</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Export Format:
              </span>
              <div>Excel (.xlsx)</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Profile Fields:
              </span>
              <div>{DEFAULT_PROFILE_FIELDS.length} fields</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle>Content Analysis Matrix</CardTitle>
          <CardDescription>
            Guide-aligned analysis with QUOTE, SUMMARY, and THEME for each
            respondent
          </CardDescription>
        </CardHeader>
        <CardContent>{renderMatrix()}</CardContent>
      </Card>
    </div>
  );
}
