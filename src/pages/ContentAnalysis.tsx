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

      // Skip fetching existing results for now - just proceed to generate new ones
      console.log(
        "Skipping existing results fetch - will generate new analysis",
      );
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
      setProgress(0);
      setCurrentStep("Initializing content analysis...");

      // Check document count for large-scale processing
      let totalDocs = 0;
      try {
        const { data: documentCount } = await supabase
          .from("research_documents")
          .select("id", {
            count: "exact",
          })
          .eq("project_id", projectId);

        totalDocs = documentCount?.length || 0;
      } catch (docError) {
        console.log(
          "Could not get document count, proceeding with analysis anyway",
        );
        totalDocs = 1; // Assume at least 1 document
      }
      console.log(`Starting content analysis for ${totalDocs} documents`);

      // Set processing stats
      setProcessingStats({
        totalDocuments: totalDocs,
        processedDocuments: 0,
        currentBatch: 1,
        totalBatches: Math.ceil(totalDocs / 5), // Assuming batch size of 5
      });

      // Simulate progress steps for large datasets
      const steps = [
        { step: "Preparing document chunks...", progress: 10 },
        { step: "Processing transcript batches...", progress: 30 },
        { step: "Extracting guide-aligned content...", progress: 60 },
        { step: "Generating matrix structure...", progress: 80 },
        { step: "Finalizing analysis...", progress: 95 },
      ];

      for (const { step, progress } of steps) {
        setCurrentStep(step);
        setProgress(progress);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Get the current session for proper authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("Making content analysis request...");
      console.log("Session exists:", !!session);
      console.log("Project ID:", projectId);

      // Use supabase-js for edge function invocation with correct function name
      const { data: response, error: functionError } =
        await supabase.functions.invoke("content-analysis", {
          body: {
            project_id: projectId,
          },
        });

      if (functionError) {
        throw new Error(
          `Content analysis function error: ${functionError.message}`,
        );
      }

      const data = response;

      console.log("Content analysis response:", data);

      if (!data?.success) {
        throw new Error(data?.error || "Content analysis failed");
      }

      console.log("=== CONTENT ANALYSIS RESPONSE DEBUG ===");
      console.log("Full response data:", JSON.stringify(data, null, 2));
      console.log("Has contentAnalysis:", !!data?.contentAnalysis);
      console.log(
        "Has contentAnalysis.questions:",
        !!data?.contentAnalysis?.questions,
      );
      console.log(
        "Questions length:",
        data?.contentAnalysis?.questions?.length || 0,
      );

      // Use the contentAnalysis structure from the response
      const contentAnalysisData = data.contentAnalysis;

      if (!contentAnalysisData) {
        throw new Error(
          "Content analysis failed: No contentAnalysis structure found in response.",
        );
      }

      if (
        !contentAnalysisData.questions ||
        !Array.isArray(contentAnalysisData.questions)
      ) {
        throw new Error(
          "Content analysis failed: No questions array found in contentAnalysis structure.",
        );
      }

      if (contentAnalysisData.questions.length === 0) {
        throw new Error(
          "Content analysis failed: No questions found. The discussion guide may not have been properly extracted.",
        );
      }

      // Set the content analysis data using the expected structure
      console.log("Setting content analysis data structure");
      setContentAnalysis({
        questions: contentAnalysisData.questions,
      });
      setHasRunAnalysis(true);

      console.log("=== CONTENT ANALYSIS SUCCESS ===");
      console.log("Questions found:", contentAnalysisData.questions.length);

      // Log first question for verification
      if (contentAnalysisData.questions.length > 0) {
        const firstQ = contentAnalysisData.questions[0];
        console.log("First question:", {
          question_type: firstQ.question_type,
          question: firstQ.question?.substring(0, 100),
          respondent_count: Object.keys(firstQ.respondents || {}).length,
        });
      }

      setProgress(100);
      setCurrentStep("Analysis complete!");

      toast({
        title: "Content Analysis Complete",
        description: `Guide-aligned matrix analysis completed for ${totalDocs} documents`,
      });
    } catch (error) {
      console.error("Content analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Analysis failed",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      setProgress(0);
      setCurrentStep("");
      setProcessingStats(null);
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

    // Group questions by sections and subsections
    const groupedQuestions = questionsToRender.reduce((acc, question) => {
      const sectionMatch = question.question_type.match(/^(Section [A-Z]+[^:]*)/);
      const section = sectionMatch ? sectionMatch[1] : "Other";
      
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(question);
      return acc;
    }, {} as Record<string, Array<typeof questionsToRender[0]>>);

    return (
      <div className="space-y-6">
        {/* Matrix Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Discussion Guide Matrix</h3>
            <p className="text-sm text-muted-foreground">
              Complete guide structure with all {questionsToRender.length} questions organized by sections
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
          <ScrollArea className="h-[800px] w-full">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Header row */}
                <div className="flex bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-b-2 border-blue-200 dark:border-blue-800 sticky top-0 z-10">
                  <div className="w-96 p-4 font-bold text-sm border-r border-border flex-shrink-0">
                    <div className="text-blue-700 dark:text-blue-300">SECTION & QUESTION</div>
                    <div className="text-xs text-muted-foreground mt-1">Complete guide structure</div>
                  </div>
                  {respondentList.map((respondent, index) => (
                    <div
                      key={respondent}
                      className={`w-80 p-4 font-bold text-sm text-center flex-shrink-0 ${
                        index < respondentList.length - 1
                          ? "border-r border-border"
                          : ""
                      }`}
                    >
                      <div className="text-purple-700 dark:text-purple-300">{respondent}</div>
                      <div className="text-xs text-muted-foreground mt-1">QUOTE | SUMMARY | THEME</div>
                    </div>
                  ))}
                </div>

                {/* Section and Question rows */}
                {Object.entries(groupedQuestions).map(([section, questions]: [string, Array<typeof questionsToRender[0]>], sectionIndex) => (
                  <div key={section}>
                    {/* Section Header */}
                    <div className="flex bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-b-2 border-yellow-200 dark:border-yellow-800">
                      <div className="w-96 p-3 border-r border-border flex-shrink-0">
                        <div className="font-bold text-sm text-yellow-800 dark:text-yellow-200">
                          {section}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {questions.length} question{questions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {respondentList.map((respondent, index) => (
                        <div
                          key={respondent}
                          className={`w-80 p-3 text-center flex-shrink-0 ${
                            index < respondentList.length - 1
                              ? "border-r border-border"
                              : ""
                          }`}
                        >
                          <div className="text-xs font-medium text-muted-foreground">
                            Section Overview
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Questions in this section */}
                    {questions.map((questionData, qIndex) => (
                      <div
                        key={`${section}-${qIndex}`}
                        className="flex border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors"
                      >
                        {/* Question cell */}
                        <div className="w-96 p-4 border-r border-border bg-white dark:bg-gray-900 flex-shrink-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">
                            {questionData.question_type.replace(section, '').trim() || 'Main Question'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {questionData.question}
                          </div>
                        </div>

                        {/* Respondent columns */}
                        {respondentList.map((respondent, rIndex) => {
                          const response = questionData.respondents?.[respondent];
                          const cellId = `${section}-${qIndex}-${respondent}`;

                          return (
                            <div
                              key={cellId}
                              className={`w-80 border-r border-border/50 last:border-r-0 flex-shrink-0 ${
                                qIndex % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/20" : "bg-white dark:bg-gray-900"
                              }`}
                            >
                              {response ? (
                                <div className="p-3 space-y-3">
                                  {/* Quote section */}
                                  <div className="border-b border-border/30 pb-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                        QUOTE
                                      </div>
                                      {response.quote && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0"
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
                                    <div className="text-xs italic text-gray-700 dark:text-gray-300 leading-relaxed hover:bg-blue-50 dark:hover:bg-blue-950/30 p-2 rounded cursor-pointer transition-colors">
                                      "{response.quote || "No quote available"}"
                                    </div>
                                  </div>

                                  {/* Summary section */}
                                  <div className="border-b border-border/30 pb-2">
                                    <div className="text-xs font-bold text-green-600 dark:text-green-400 mb-1">
                                      SUMMARY
                                    </div>
                                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-950/30 p-2 rounded transition-colors">
                                      {response.summary || "No summary available"}
                                    </div>
                                  </div>

                                  {/* Theme section */}
                                  <div>
                                    <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">
                                      THEME
                                    </div>
                                    <div className="text-xs font-medium leading-relaxed">
                                      <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30">
                                        {response.theme || "No theme identified"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 text-center">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    No Response
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    AI found no relevant content
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
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
              navigate(`/dashboard/projects/${projectId}/pro-advanced-analysis`)
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
