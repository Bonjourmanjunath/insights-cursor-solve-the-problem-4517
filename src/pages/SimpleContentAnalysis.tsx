import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Play, FileSpreadsheet, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SimpleContentAnalysis() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("❌ You need to log in first!");
        setLoading(false);
        return;
      }

      // Get project
      const { data: projectData } = await supabase
        .from("research_projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)  // Only get projects that belong to current user
        .single();

      if (!projectData) {
        setStatus("❌ Project not found or doesn't belong to you");
        setLoading(false);
        return;
      }

      setProject(projectData);
      setStatus("✅ Project loaded successfully!");
      
      // Check if we have existing results
      const { data: existingResults } = await supabase
        .from("content_analysis_results")
        .select("*")
        .eq("research_project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (existingResults?.analysis_data?.content_analysis) {
        setResults(existingResults.analysis_data.content_analysis);
      }
    } catch (error) {
      console.error("Error loading project:", error);
      setStatus("❌ Error loading project");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!project) return;
    
    setAnalyzing(true);
    setStatus("🔄 Starting content analysis...");
    
    try {
      // Step 1: Create the analysis job
      setStatus("📝 Creating analysis job...");
      
      const { data: jobData, error: jobError } = await supabase.functions.invoke(
        "content-analysis-queue",
        {
          body: { project_id: projectId }
        }
      );

      if (jobError) {
        throw new Error(`Failed to create job: ${jobError.message}`);
      }

      if (!jobData?.success) {
        throw new Error(jobData?.error || "Failed to create analysis job");
      }

      setStatus("✅ Job created! Job ID: " + jobData.job_id);
      
      // Step 2: Trigger the worker a few times
      for (let i = 0; i < 5; i++) {
        setStatus(`🔄 Processing... (attempt ${i + 1}/5)`);
        
        await supabase.functions.invoke("content-analysis-worker");
        
        // Wait 3 seconds between attempts
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if job is complete
        const { data: job } = await supabase
          .from("content_analysis_jobs")
          .select("*")
          .eq("id", jobData.job_id)
          .single();
          
        if (job?.status === "completed") {
          setStatus("✅ Analysis completed!");
          break;
        }
      }
      
      // Step 3: Load the results
      const { data: newResults } = await supabase
        .from("content_analysis_results")
        .select("*")
        .eq("research_project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (newResults?.analysis_data?.content_analysis) {
        setResults(newResults.analysis_data.content_analysis);
        toast({
          title: "Success!",
          description: "Content analysis completed successfully"
        });
      } else {
        throw new Error("No results found after analysis");
      }
      
    } catch (error: any) {
      console.error("Analysis error:", error);
      setStatus(`❌ Error: ${error.message}`);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "content-analysis-excel",
        {
          body: {
            projectId,
            profileFields: ["Country", "Segment", "Usage", "User Type"]
          }
        }
      );

      if (error) throw error;

      // Download the file
      const blob = new Blob([atob(data.file)], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || "content-analysis.csv";
      a.click();
      
      toast({
        title: "Export Successful",
        description: "Your Excel file has been downloaded"
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/projects")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
          <h1 className="text-3xl font-bold">
            {project?.name || "Content Analysis"}
          </h1>
          <p className="text-muted-foreground">
            Simple content analysis for your transcripts
          </p>
        </div>
      </div>

      {/* Status */}
      {status && (
        <Alert>
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>Content Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!results ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No analysis results yet. Click the button below to start.
              </p>
              <Button 
                onClick={runAnalysis} 
                disabled={analyzing}
                size="lg"
              >
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
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Analysis Results ({results.questions?.length || 0} questions)
                </h3>
                <div className="flex gap-2">
                  <Button onClick={runAnalysis} disabled={analyzing} variant="outline">
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
                  <Button onClick={exportToExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
              </div>

              {/* Simple Results Display */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Question</th>
                      <th className="p-2 text-left">Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.questions?.map((q: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 align-top">
                          <div className="font-medium">{q.question}</div>
                          <div className="text-sm text-muted-foreground">
                            {q.section}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {Object.keys(q.respondents || {}).length} respondents
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}