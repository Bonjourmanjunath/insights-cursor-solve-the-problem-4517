import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { GuideAwareContentAnalysisService } from "@/services/guide-aware-content-analysis";

export default function GuideAwareContentAnalysis() {
  const [discussionGuide, setDiscussionGuide] = useState("");
  const [transcriptFiles, setTranscriptFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setTranscriptFiles(files);
  };

  const handleAnalyze = async () => {
    if (!discussionGuide.trim()) {
      toast({
        title: "Error",
        description: "Please enter a discussion guide",
        variant: "destructive",
      });
      return;
    }

    if (transcriptFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one transcript file",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      // Validate the discussion guide first
      const validation = await GuideAwareContentAnalysisService.validateDiscussionGuide(discussionGuide);
      
      if (!validation.isValid) {
        toast({
          title: "Invalid Discussion Guide",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }

      setProgress(20);

      // Run the analysis
      const analysisResult = await GuideAwareContentAnalysisService.analyze({
        projectId: "test-project",
        discussionGuide,
        transcriptFiles,
      });

      setProgress(100);
      setResults(analysisResult);

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${transcriptFiles.length} transcripts`,
      });

    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guide-Aware Content Analysis</CardTitle>
          <CardDescription>
            Upload your discussion guide and transcript files for intelligent analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Discussion Guide Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Discussion Guide</label>
            <Textarea
              placeholder="Paste your discussion guide here... Include sections, subsections, and questions exactly as written."
              value={discussionGuide}
              onChange={(e) => setDiscussionGuide(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Transcript Files</label>
            <input
              type="file"
              multiple
              accept=".txt,.doc,.docx"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {transcriptFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {transcriptFiles.map((file, index) => (
                  <Badge key={index} variant="secondary">
                    {file.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Progress */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analyzing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !discussionGuide.trim() || transcriptFiles.length === 0}
            className="w-full"
          >
            {isAnalyzing ? "Analyzing..." : "Run Guide-Aware Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Guide-aware analysis completed successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Guide Structure:</h4>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(results.sections, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Analysis Summary:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Sections:</span> {results.sections.length}
                  </div>
                  <div>
                    <span className="font-medium">Transcripts:</span> {transcriptFiles.length}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 