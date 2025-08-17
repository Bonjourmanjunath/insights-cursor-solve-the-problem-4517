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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Play,
  Download,
  RefreshCw,
  BarChart3,
  FileText,
  FileSpreadsheet,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AIChat from "@/components/AIChat";
import { ErrorHandler, ErrorUtils, ERROR_CODES } from "@/lib/error-handler";
// @ts-ignore - types will be generated after migration
import { useIngestProgress } from "@/hooks/useIngestProgress";
import { IngestProgress } from "@/components/IngestProgress";

interface Project {
  id: string;
  name: string;
  project_type?: string;
  stakeholder_type?: string;
  country?: string;
  therapy_area?: string;
}

export default function ProjectAnalysis() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // @ts-ignore - types will be generated after migration
  const ingestProgress = useIngestProgress(projectId || null);

  // Show a one-time toast when processing completes
  const [ingestNotified, setIngestNotified] = useState(false);
  useEffect(() => {
    if (
      ingestProgress?.progress?.status === "completed" &&
      !ingestNotified
    ) {
      toast({
        title: "Documents Processed",
        description: "Chunking and embeddings are ready. You can run analyses now.",
      });
      setIngestNotified(true);
    }
  }, [ingestProgress?.progress?.status, ingestNotified, toast]);

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

      // Fetch project data with error handling
      const projectData = await ErrorUtils.withErrorHandling(
        async () => {
          const { data, error } = await supabase
            .from("research_projects")
            .select("*")
            .eq("id", projectId)
            .single();

          if (error) {
            throw new Error("Project not found");
          }

          return data;
        },
        {
          operation: "fetch_project",
          projectId,
        },
      );

      setProject(projectData);

      // Fetch existing analysis results with error handling
      try {
        const analysisData = await ErrorUtils.withErrorHandling(
          async () => {
            const { data, error } = await supabase
              .from("analysis_results")
              .select("analysis_data, created_at, updated_at")
              .eq("research_project_id", projectId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .single();

            if (error && error.code !== "PGRST116") {
              throw error;
            }

            return data;
          },
          {
            operation: "fetch_analysis_results",
            projectId,
          },
        );

        if (analysisData) {
          console.log("=== LOADED EXISTING ANALYSIS ===");
          console.log("Analysis data:", analysisData.analysis_data);
          console.log("Last updated:", analysisData.updated_at);

          setAnalysis(analysisData.analysis_data);

          toast({
            title: "Analysis Loaded",
            description: `Previous analysis from ${new Date(analysisData.updated_at).toLocaleDateString()} loaded successfully`,
          });
        }
      } catch (analysisError) {
        // Analysis loading failed, but project loaded successfully
        console.log("No existing analysis found or error loading analysis");
      }
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, {
        operation: "fetch_project_and_analysis",
        projectId,
      });

      toast({
        title: "Failed to Load Project",
        description: errorResponse.userMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processDocuments = async () => {
    if (!project) return;

    try {
      setProcessing(true);

      const { data, error } = await supabase.functions.invoke(
        "document-processor",
        {
          body: {
            project_id: projectId,
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: "Documents Processed",
          description: `Processed ${data.processed} out of ${data.total} documents`,
        });
      } else {
        throw new Error(data?.error || "Document processing failed");
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process documents",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const exportToExcel = () => {
    if (!analysis) {
      toast({
        title: "No Analysis Available",
        description: "Please run the analysis first before exporting.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create workbook with structured data matching screen display
      const workbook = XLSX.utils.book_new();

      // Content Analysis Sheet - Matrix format as displayed on screen (FIRST)
      if (
        analysis.content_analysis?.questions &&
        Array.isArray(analysis.content_analysis.questions)
      ) {
        // Get all unique respondents
        const allRespondents = new Set<string>();
        analysis.content_analysis.questions.forEach((q: any) => {
          if (q.respondents) {
            Object.keys(q.respondents).forEach((resp) =>
              allRespondents.add(resp),
            );
          }
        });
        const respondentList = Array.from(allRespondents).sort();

        // Create matrix data
        const contentData: any[][] = [];

        // Header row
        const headerRow = ["Question Category", ...respondentList];
        contentData.push(headerRow);

        // Question rows with 3 sub-rows each (Quote, Summary, Theme)
        analysis.content_analysis.questions.forEach((questionData: any) => {
          // Question type row
          const questionRow = [
            `${questionData.question_type}: ${questionData.question}`,
            ...respondentList.map(() => ""),
          ];
          contentData.push(questionRow);

          // Quote row
          const quoteRow = [
            "QUOTE",
            ...respondentList.map((respondent) => {
              const response = questionData.respondents?.[respondent];
              return response?.quote ? `"${response.quote}"` : "-";
            }),
          ];
          contentData.push(quoteRow);

          // Summary row
          const summaryRow = [
            "SUMMARY",
            ...respondentList.map((respondent) => {
              const response = questionData.respondents?.[respondent];
              return response?.summary || "-";
            }),
          ];
          contentData.push(summaryRow);

          // Theme row
          const themeRow = [
            "THEME",
            ...respondentList.map((respondent) => {
              const response = questionData.respondents?.[respondent];
              return response?.theme || "-";
            }),
          ];
          contentData.push(themeRow);

          // Empty row for separation
          contentData.push(["", ...respondentList.map(() => "")]);
        });

        const contentSheet = XLSX.utils.aoa_to_sheet(contentData);

        // Set column widths for better readability
        contentSheet["!cols"] = [
          { width: 35 }, // Question Category
          ...respondentList.map(() => ({ width: 50 })), // Respondent columns
        ];

        // Style header row
        const headerStyle = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E6F3FF" } }, // Blue background for Content Analysis
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        };

        // Apply header styles to all columns in first row
        for (let i = 0; i < headerRow.length; i++) {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
          if (!contentSheet[cellRef]) contentSheet[cellRef] = {};
          contentSheet[cellRef].s = headerStyle;
        }

        XLSX.utils.book_append_sheet(
          workbook,
          contentSheet,
          "Content Analysis",
        );
      }

      // FMR Dish Sheet - Matrix format as displayed on screen
      if (
        analysis.fmr_dish?.questions &&
        Array.isArray(analysis.fmr_dish.questions)
      ) {
        // Get all unique respondents
        const allRespondents = new Set<string>();
        analysis.fmr_dish.questions.forEach((q: any) => {
          if (q.respondents) {
            Object.keys(q.respondents).forEach((resp) =>
              allRespondents.add(resp),
            );
          }
        });
        const respondentList = Array.from(allRespondents).sort();

        // Create matrix data
        const fmrData: any[][] = [];

        // Header row
        const headerRow = ["Question Category", ...respondentList];
        fmrData.push(headerRow);

        // Question rows with 3 sub-rows each (Quote, Summary, Theme)
        analysis.fmr_dish.questions.forEach((questionData: any) => {
          // Question type row
          const questionRow = [
            `${questionData.question_type}: ${questionData.question}`,
            ...respondentList.map(() => ""),
          ];
          fmrData.push(questionRow);

          // Quote row
          const quoteRow = [
            "QUOTE",
            ...respondentList.map((respondent) => {
              const response = questionData.respondents?.[respondent];
              return response?.quote ? `"${response.quote}"` : "-";
            }),
          ];
          fmrData.push(quoteRow);

          // Summary row
          const summaryRow = [
            "SUMMARY",
            ...respondentList.map((respondent) => {
              const response = questionData.respondents?.[respondent];
              return response?.summary || "-";
            }),
          ];
          fmrData.push(summaryRow);

          // Theme row
          const themeRow = [
            "THEME",
            ...respondentList.map((respondent) => {
              const response = questionData.respondents?.[respondent];
              return response?.theme || "-";
            }),
          ];
          fmrData.push(themeRow);

          // Empty row for separation
          fmrData.push(["", ...respondentList.map(() => "")]);
        });

        const fmrSheet = XLSX.utils.aoa_to_sheet(fmrData);

        // Set column widths for better readability
        fmrSheet["!cols"] = [
          { width: 35 }, // Question Category
          ...respondentList.map(() => ({ width: 50 })), // Respondent columns
        ];

        // Style header row
        const headerStyle = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F2F2F2" } },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        };

        // Apply header styles to all columns in first row
        for (let i = 0; i < headerRow.length; i++) {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
          if (!fmrSheet[cellRef]) fmrSheet[cellRef] = {};
          fmrSheet[cellRef].s = headerStyle;
        }

        XLSX.utils.book_append_sheet(workbook, fmrSheet, "FMR Dish Analysis");
      }

      // Mode Analysis Sheet - handles customer journey 12-field structure
      if (
        analysis.mode_analysis?.table &&
        Array.isArray(analysis.mode_analysis.table)
      ) {
        const firstRow = analysis.mode_analysis.table[0];
        if (firstRow) {
          const headers = Object.keys(firstRow).map(
            (key) =>
              key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          );
          const modeData = [
            headers,
            ...analysis.mode_analysis.table.map((row: any) =>
              Object.keys(firstRow).map((key) => row[key] || ""),
            ),
          ];
          const modeSheet = XLSX.utils.aoa_to_sheet(modeData);

          // Set appropriate column widths for customer journey fields
          const columnWidths = headers.map((header) => {
            if (
              header.toLowerCase().includes("quote") ||
              header.toLowerCase().includes("barrier")
            ) {
              return { width: 60 };
            } else if (
              header.toLowerCase().includes("emotion") ||
              header.toLowerCase().includes("support")
            ) {
              return { width: 25 };
            } else if (
              header.toLowerCase().includes("clinical") ||
              header.toLowerCase().includes("information")
            ) {
              return { width: 45 };
            } else {
              return { width: 35 };
            }
          });

          modeSheet["!cols"] = columnWidths;

          // Style header row for mode analysis
          const headerStyle = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E8F4F8" } },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          };

          // Apply header styles to all columns dynamically
          for (let i = 0; i < headers.length; i++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
            if (!modeSheet[cellRef]) modeSheet[cellRef] = {};
            modeSheet[cellRef].s = headerStyle;
          }

          // Use appropriate sheet name based on project type
          const sheetName =
            project?.project_type === "customer_journey"
              ? "Customer Journey Analysis"
              : "Mode Analysis";
          XLSX.utils.book_append_sheet(workbook, modeSheet, sheetName);
        }
      }

      // Strategic Themes Sheet - exactly as displayed
      if (
        analysis.strategic_themes?.table &&
        Array.isArray(analysis.strategic_themes.table)
      ) {
        const themesData = [
          ["Theme", "Rationale", "Supporting Quotes"],
          ...analysis.strategic_themes.table.map((theme: any) => [
            theme.theme || "",
            theme.rationale || "",
            theme.supporting_quotes || "",
          ]),
        ];
        const themesSheet = XLSX.utils.aoa_to_sheet(themesData);

        themesSheet["!cols"] = [
          { width: 30 }, // Theme
          { width: 50 }, // Rationale
          { width: 60 }, // Supporting Quotes
        ];

        XLSX.utils.book_append_sheet(workbook, themesSheet, "Strategic Themes");
      }

      // Executive Summary Sheet - exactly as displayed
      if (analysis.summary?.content) {
        const summaryData = [
          ["Executive Summary"],
          [""],
          [analysis.summary.content],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

        summarySheet["!cols"] = [{ width: 100 }];

        // Merge cells for title
        summarySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }];

        XLSX.utils.book_append_sheet(
          workbook,
          summarySheet,
          "Executive Summary",
        );
      }

      // Add project info sheet
      const projectInfo = [
        ["Project Information"],
        [""],
        ["Project Name:", project?.name || "Unknown"],
        ["Analysis Type:", getProjectTypeDisplay(project?.project_type)],
        ["Generated:", new Date().toLocaleDateString()],
        ["Stakeholder Type:", project?.stakeholder_type || "Not specified"],
        ["Country:", project?.country || "Not specified"],
        ["Therapy Area:", project?.therapy_area || "Not specified"],
      ];
      const infoSheet = XLSX.utils.aoa_to_sheet(projectInfo);
      infoSheet["!cols"] = [{ width: 20 }, { width: 40 }];

      XLSX.utils.book_append_sheet(workbook, infoSheet, "Project Info");

      // Generate and download file
      const fileName = `${project?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Project"}_FMR_Analysis_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Convert workbook to array buffer and save
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, fileName);

      toast({
        title: "Export Successful",
        description:
          "Analysis exported as Excel file with proper formatting and multiple sheets.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export analysis results.",
        variant: "destructive",
      });
    }
  };

  const runBasicAnalysis = async () => {
    if (!project) return;

    try {
      setAnalyzing(true);

      // Run Basic analysis with retry logic and error handling
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

          if (error) {
            throw new Error(error.message);
          }

          if (!data?.success) {
            throw new Error(data?.error || "Analysis failed");
          }

          return data;
        },
        3,
        {
          operation: "run_basic_analysis",
          projectId,
        },
      );

      console.log("=== BASIC ANALYSIS SUCCESS ===");
      console.log("Raw basic analysis data:", data.analysis);

      // Parse the wrapped JSON structure from Azure OpenAI for Basic analysis
      let finalAnalysis = data.analysis;
      if (finalAnalysis?.fmr_dish?.content?._type === "String") {
        try {
          finalAnalysis = JSON.parse(finalAnalysis.fmr_dish.content.value);
          console.log("Parsed basic structured data:", finalAnalysis);
        } catch (parseError) {
          console.error("Failed to parse basic structured data:", parseError);
          // Continue with original data if parsing fails
        }
      }

      // Add detailed logging for chat debugging
      console.log("=== SETTING BASIC ANALYSIS ===");
      console.log("Basic analysis structure:", finalAnalysis);
      console.log("FMR Dish available:", !!finalAnalysis?.fmr_dish?.questions);
      console.log(
        "Mode Analysis available:",
        !!finalAnalysis?.mode_analysis?.table,
      );
      console.log(
        "Strategic Themes available:",
        !!finalAnalysis?.strategic_themes?.table,
      );
      console.log("Summary available:", !!finalAnalysis?.summary?.content);

      setAnalysis(finalAnalysis);

      toast({
        title: "Analysis Complete",
        description:
          "Basic analysis completed successfully. You can now view results in all tabs.",
      });
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, {
        operation: "run_basic_analysis",
        projectId,
      });

      toast({
        title: "Analysis Failed",
        description: errorResponse.userMessage,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getProjectTypeDisplay = (projectType?: string) => {
    if (!projectType) return "Not specified";

    return projectType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const generateQuickPrompts = (analysis: any) => {
    if (!analysis) {
      return [
        "How do I interpret FMR Dish results?",
        "What should I look for in strategic themes?",
        "Help me understand the analysis framework",
      ];
    }

    const prompts = [];

    // Dynamic prompts based on available analysis
    if (analysis.fmr_dish?.table?.length > 0) {
      prompts.push("Summarize top emotional blockers");
      prompts.push("Show unmet needs from behavioral drivers");
      prompts.push("Give me 1 quote per theme");
    }

    if (analysis.strategic_themes?.table?.length > 0) {
      prompts.push("What makes HCPs hesitant?");
      prompts.push("List friction points in digital experience");
    }

    if (analysis.mode_analysis?.table?.length > 0) {
      prompts.push("Create a 3-bullet summary for slides");
      prompts.push("Draft persona from theme X");
    }

    // Add stakeholder-specific prompts
    if (project?.stakeholder_type === "Patient") {
      prompts.push("Show patient emotional journey");
    } else if (project?.stakeholder_type === "HCP") {
      prompts.push("What drives HCP decision making?");
    }

    return prompts.length > 0
      ? prompts
      : [
          "Summarize key insights",
          "Show main themes",
          "Extract important quotes",
        ];
  };

  const renderUniversalContentAnalysis = () => {
    if (!analysis) {
      // Custom no analysis state for Content Analysis tab
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Universal Content Analysis
          </h3>
          <p className="text-muted-foreground mb-4">
            Universal content analysis runs automatically with FMR analysis
          </p>
          <p className="text-sm text-muted-foreground">
            Go to FMR Dish tab and click "Run Basic Analysis" to generate the
            analysis
          </p>
        </div>
      );
    }

    // Use universal content analysis data - independent of project type
    const contentData = analysis.content_analysis; // Only use content_analysis, no fallback

    return (
      <div className="space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold">
                Universal Content Analysis
              </h4>
              <p className="text-muted-foreground text-sm">
                Matrix view organized by question categories and respondents
                (Universal Analysis)
              </p>
            </div>
          </div>
        </div>

        {analysis.content_analysis?.questions &&
        Array.isArray(analysis.content_analysis.questions) &&
        analysis.content_analysis.questions.length > 0 ? (
          <div className="w-full">
            <ScrollArea className="h-[600px] w-full">
              <div className="overflow-x-auto">
                {/* Get all unique respondents */}
                {(() => {
                  const allRespondents = new Set<string>();
                  analysis.content_analysis.questions.forEach((q: any) => {
                    if (q.respondents) {
                      Object.keys(q.respondents).forEach((resp) =>
                        allRespondents.add(resp),
                      );
                    }
                  });
                  const respondentList = Array.from(allRespondents).sort();

                  return (
                    <div className="min-w-max border border-border rounded-lg overflow-hidden bg-background">
                      {/* Header row with respondent columns */}
                      <div className="flex bg-muted/50 border-b border-border">
                        <div className="w-72 p-4 font-semibold text-sm border-r border-border flex-shrink-0">
                          Question Category
                        </div>
                        {respondentList.map((respondent, index) => (
                          <div
                            key={respondent}
                            className={`w-80 p-4 font-semibold text-sm text-center flex-shrink-0 ${
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
                      {analysis.content_analysis.questions.map(
                        (questionData: any, qIndex: number) => (
                          <div
                            key={qIndex}
                            className="flex border-b border-border last:border-b-0"
                          >
                            {/* Question category cell */}
                            <div className="w-72 p-4 border-r border-border bg-blue-500/5 flex-shrink-0">
                              <div className="font-medium text-sm text-blue-600 mb-2">
                                {questionData.question_type}
                              </div>
                              <div className="text-xs text-muted-foreground leading-relaxed">
                                {questionData.question}
                              </div>
                            </div>

                            {/* Respondent columns */}
                            {respondentList.map((respondent, rIndex) => {
                              const response =
                                questionData.respondents?.[respondent];

                              return (
                                <div
                                  key={`${qIndex}-${respondent}`}
                                  className={`w-80 border-r border-border last:border-r-0 flex-shrink-0 ${
                                    qIndex % 2 === 0
                                      ? "bg-background"
                                      : "bg-muted/20"
                                  }`}
                                >
                                  {response ? (
                                    <div className="p-4 space-y-3">
                                      {/* Quote row */}
                                      <div className="border-b border-border/50 pb-3">
                                        <div className="text-xs font-semibold text-blue-600 mb-2">
                                          QUOTE
                                        </div>
                                        <div className="text-xs italic text-muted-foreground leading-relaxed">
                                          "
                                          {response.quote ||
                                            "No quote available"}
                                          "
                                        </div>
                                      </div>

                                      {/* Summary row */}
                                      <div className="border-b border-border/50 pb-3">
                                        <div className="text-xs font-semibold text-green-600 mb-2">
                                          SUMMARY
                                        </div>
                                        <div className="text-xs leading-relaxed">
                                          {response.summary ||
                                            "No summary available"}
                                        </div>
                                      </div>

                                      {/* Theme row */}
                                      <div>
                                        <div className="text-xs font-semibold text-purple-600 mb-2">
                                          THEME
                                        </div>
                                        <div className="text-xs font-medium leading-relaxed">
                                          {response.theme ||
                                            "No theme identified"}
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
                        ),
                      )}
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>
          </div>
        ) : (
          renderNoAnalysis()
        )}

        {/* Excel Export Button - Using existing function */}
        <div className="flex justify-center pt-4">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel Report
          </Button>
        </div>
      </div>
    );
  };

  const renderFMRDish = () => {
    if (!analysis) return renderNoAnalysis();

    const fmrData = analysis.fmr_dish;

    return (
      <div className="space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold">Basic Analysis</h4>
              <p className="text-muted-foreground text-sm">
                Matrix view organized by question categories and respondents
              </p>
            </div>
          </div>
        </div>

        {fmrData?.questions &&
        Array.isArray(fmrData.questions) &&
        fmrData.questions.length > 0 ? (
          <div className="w-full">
            <ScrollArea className="h-[600px] w-full">
              <div className="overflow-x-auto">
                {/* Get all unique respondents */}
                {(() => {
                  const allRespondents = new Set<string>();
                  fmrData.questions.forEach((q: any) => {
                    if (q.respondents) {
                      Object.keys(q.respondents).forEach((resp) =>
                        allRespondents.add(resp),
                      );
                    }
                  });
                  const respondentList = Array.from(allRespondents).sort();

                  return (
                    <div className="min-w-max border border-border rounded-lg overflow-hidden bg-background">
                      {/* Header row with respondent columns */}
                      <div className="flex bg-muted/50 border-b border-border">
                        <div className="w-72 p-4 font-semibold text-sm border-r border-border flex-shrink-0">
                          Question Category
                        </div>
                        {respondentList.map((respondent, index) => (
                          <div
                            key={respondent}
                            className={`w-80 p-4 font-semibold text-sm text-center flex-shrink-0 ${
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
                      {fmrData.questions.map(
                        (questionData: any, qIndex: number) => (
                          <div
                            key={qIndex}
                            className="flex border-b border-border last:border-b-0"
                          >
                            {/* Question category cell */}
                            <div className="w-72 p-4 border-r border-border bg-primary/5 flex-shrink-0">
                              <div className="font-medium text-sm text-primary mb-2">
                                {questionData.question_type}
                              </div>
                              <div className="text-xs text-muted-foreground leading-relaxed">
                                {questionData.question}
                              </div>
                            </div>

                            {/* Respondent columns */}
                            {respondentList.map((respondent, rIndex) => {
                              const response =
                                questionData.respondents?.[respondent];

                              return (
                                <div
                                  key={`${qIndex}-${respondent}`}
                                  className={`w-80 border-r border-border last:border-r-0 flex-shrink-0 ${
                                    qIndex % 2 === 0
                                      ? "bg-background"
                                      : "bg-muted/20"
                                  }`}
                                >
                                  {response ? (
                                    <div className="p-4 space-y-3">
                                      {/* Quote row */}
                                      <div className="border-b border-border/50 pb-3">
                                        <div className="text-xs font-semibold text-blue-600 mb-2">
                                          QUOTE
                                        </div>
                                        <div className="text-xs italic text-muted-foreground leading-relaxed">
                                          "
                                          {response.quote ||
                                            "No quote available"}
                                          "
                                        </div>
                                      </div>

                                      {/* Summary row */}
                                      <div className="border-b border-border/50 pb-3">
                                        <div className="text-xs font-semibold text-green-600 mb-2">
                                          SUMMARY
                                        </div>
                                        <div className="text-xs leading-relaxed">
                                          {response.summary ||
                                            "No summary available"}
                                        </div>
                                      </div>

                                      {/* Theme row */}
                                      <div>
                                        <div className="text-xs font-semibold text-purple-600 mb-2">
                                          THEME
                                        </div>
                                        <div className="text-xs font-medium leading-relaxed">
                                          {response.theme ||
                                            "No theme identified"}
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
                        ),
                      )}
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>
          </div>
        ) : (
          renderNoAnalysis()
        )}
      </div>
    );
  };

  const renderModeAnalysis = () => {
    if (!analysis) return renderNoAnalysis();

    const modeData = analysis.mode_analysis;
    return (
      <div className="space-y-4">
        {modeData?.table &&
        Array.isArray(modeData.table) &&
        modeData.table.length > 0 ? (
          <>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">
                📈 Mode-Specific Analysis
              </h4>
              <p className="text-muted-foreground text-sm">
                Analysis tailored to your project type:{" "}
                {getProjectTypeDisplay(project?.project_type)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    {Object.keys(modeData.table[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="border border-border p-3 text-left font-semibold"
                      >
                        {header.charAt(0).toUpperCase() +
                          header.slice(1).replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modeData.table.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-muted/50">
                      {Object.keys(modeData.table[0] || {}).map((header) => (
                        <td
                          key={header}
                          className="border border-border p-3 text-sm"
                        >
                          {row[header] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : modeData?.content ? (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
              {modeData.content}
            </pre>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Mode-specific analysis not available
          </p>
        )}
        {renderActionButtons()}
      </div>
    );
  };

  const renderStrategicThemes = () => {
    if (!analysis) return renderNoAnalysis();

    const themesData = analysis.strategic_themes;
    return (
      <div className="space-y-4">
        {themesData?.table &&
        Array.isArray(themesData.table) &&
        themesData.table.length > 0 ? (
          <>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">
                🧠 Strategic Themes Summary
              </h4>
              <p className="text-muted-foreground text-sm">
                High-level themes and strategic insights
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left font-semibold">
                      Theme
                    </th>
                    <th className="border border-border p-3 text-left font-semibold">
                      Rationale
                    </th>
                    <th className="border border-border p-3 text-left font-semibold">
                      Supporting Quotes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {themesData.table.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="border border-border p-3 text-sm">
                        {row.theme || "-"}
                      </td>
                      <td className="border border-border p-3 text-sm">
                        {row.rationale || "-"}
                      </td>
                      <td className="border border-border p-3 text-sm">
                        {row.supporting_quotes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : themesData?.content ? (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
              {themesData.content}
            </pre>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Strategic themes analysis not available
          </p>
        )}
        {renderActionButtons()}
      </div>
    );
  };

  const renderSummary = () => {
    if (!analysis) return renderNoAnalysis();

    const summaryData = analysis.summary;
    return (
      <div className="space-y-4">
        {summaryData?.content ? (
          <>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">
                📝 Executive Summary
              </h4>
              <p className="text-muted-foreground text-sm">
                Condensed insights and recommendations
              </p>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {summaryData.content}
                </p>
              </div>
            </div>
          </>
        ) : analysis && typeof analysis === "string" ? (
          <>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">
                📝 Executive Summary
              </h4>
              <p className="text-muted-foreground text-sm">
                Condensed insights and recommendations
              </p>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="bg-muted/30 p-4 rounded-lg">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                  {analysis}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">
            Executive summary not available
          </p>
        )}
        {renderActionButtons()}
      </div>
    );
  };

  const renderNoAnalysis = () => (
    <div className="text-center py-12">
      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Analysis Available</h3>
      <p className="text-muted-foreground mb-4">
        Run basic analysis to generate insights from your transcripts.
      </p>
      <div className="flex gap-2 justify-center">
        <Button
          onClick={processDocuments}
          disabled={processing}
          variant="outline"
        >
          {processing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Process Documents
            </>
          )}
        </Button>
        <Button onClick={runBasicAnalysis} disabled={analyzing}>
          {analyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Basic Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderActionButtons = () => (
    <div className="flex gap-2 pt-4">
      <Button onClick={runBasicAnalysis} disabled={analyzing} variant="outline">
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
      <Button onClick={exportToExcel} variant="outline">
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Export to Excel
      </Button>
    </div>
  );

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
          onClick={() => navigate("/projects")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {project.name} - Basic Analysis
          </h1>
          <p className="text-muted-foreground">
            Qualitative research insights using basic analysis methodology
          </p>
        </div>

        {/* Pro Advanced Analysis Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/dashboard/projects/${projectId}/advanced-analysis`)
            }
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Pro Advanced Analysis
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

      {/* Ingest Progress */}
      {ingestProgress && !ingestProgress.loading && (
        <Card>
          <CardHeader>
            <CardTitle>Document Processing Status</CardTitle>
            <CardDescription>
              Track the progress of document chunking and embedding generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IngestProgress
              progress={ingestProgress.progress}
              jobs={ingestProgress.jobs}
              progressPercentage={ingestProgress.progressPercentage}
              needsIngest={ingestProgress.needsIngest}
              onTriggerIngest={ingestProgress.triggerIngest}
              onProcessJobs={ingestProgress.processJobs}
              loading={ingestProgress.loading}
            />
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      <Tabs defaultValue="fmr-dish" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fmr-dish">Basic Analysis</TabsTrigger>
          <TabsTrigger value="mode-specific">Mode Analysis</TabsTrigger>
          <TabsTrigger value="themes">Strategic Themes</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="fmr-dish" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Analysis</CardTitle>
              <CardDescription>
                Core qualitative insights organized by questions and respondents
              </CardDescription>
            </CardHeader>
            <CardContent>{renderFMRDish()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mode-specific" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mode-Specific Analysis</CardTitle>
              <CardDescription>
                Analysis tailored to your project type:{" "}
                {getProjectTypeDisplay(project.project_type)}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderModeAnalysis()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Themes</CardTitle>
              <CardDescription>
                High-level themes and strategic insights
              </CardDescription>
            </CardHeader>
            <CardContent>{renderStrategicThemes()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
              <CardDescription>
                Condensed insights and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>{renderSummary()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>AI Research Assistant</CardTitle>
                    <CardDescription>
                      Ask questions about your {project?.name} analysis and
                      insights
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Context Available:</strong> This AI has access to
                    your basic analysis, strategic themes, and project insights.
                    Ask questions like "What are the main barriers?" or
                    "Summarize key themes."
                  </p>
                </div>

                {/* Analysis Status Check */}
                {!analysis ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <p className="text-sm font-medium">
                        No Analysis Data Available
                      </p>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Please run the basic analysis from the other tabs first,
                      then return to chat about your insights.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={runBasicAnalysis}
                        disabled={analyzing || !project}
                      >
                        {analyzing
                          ? "Running Analysis..."
                          : "Run Basic Analysis"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm font-medium">Analysis Data Ready</p>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Chat assistant has access to your basic analysis data
                    </p>
                  </div>
                )}

                {/* Chat Interface */}
                <div className="h-[600px]">
                  <AIChat
                    project={project}
                    analysis={analysis}
                    quickPrompts={generateQuickPrompts(analysis)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
