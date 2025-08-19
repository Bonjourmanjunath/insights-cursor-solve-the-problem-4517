import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon, Upload, X, Info, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import FileUploadService, {
  FILE_TYPE_CONFIGS,
} from "@/services/file-upload-service";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// FMR Project Type Categories and Options
const PROJECT_TYPE_CATEGORIES = {
  "Journey-Based": {
    "Customer Journey": "customer_journey",
    "Patient Journey": "patient_journey",
    "Diagnostic Pathway": "diagnostic_pathway",
  },
  "Persona & Behavior": {
    "Persona Mapping": "persona_mapping",
    "Behavioral Drivers": "behavioral_drivers",
    "Unmet Needs": "unmet_needs",
  },
  "Treatment Decision": {
    "Treatment Decision": "treatment_decision",
  },
  "Market / Strategy": {
    "KOL Mapping": "kol_mapping",
    "Market Potential": "market_potential",
    "Product Potential": "product_potential",
    "Product Positioning": "product_positioning",
    "Market Understanding": "market_understanding",
    "Launch Readiness": "launch_readiness",
  },
  "Messaging & Material Testing": {
    "Message Testing": "message_testing",
    "Concept Testing": "concept_testing",
    "Material Testing": "material_testing",
    "Visual Claims Testing": "visual_claims_testing",
    "Story Flow": "story_flow",
    "Device Messaging": "device_messaging",
    "Co-Creation": "co_creation",
  },
  "Digital Experience": {
    "Touchpoint Experience": "touchpoint_experience",
    "Digital Usability": "digital_usability",
  },
};

const PRIORITIES = ["low", "medium", "high"];
const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
];

interface ProjectFormData {
  name: string;
  description: string;
  research_goal: string;
  project_type: string;
  stakeholder_type: string;
  country: string;
  therapy_area: string;
  language: string[];
  guide_context: string;
  priority: string;
  deadline: Date | undefined;
  owner: string;
  transcript_format: string;
  rfp_summary: string;
  research_hypothesis?: string;
  research_dictionary?: string;
  guided_themes?: string[];
  transcripts: File[];
}

interface ParsedGuide {
  sections: Array<{
    id: string;
    title: string;
    questions: Array<{
      id: string;
      text: string;
    }>;
  }>;
  coverage: number;
  totalQuestions: number;
  rawQL: number;
}

interface ProjectFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<ProjectFormData>;
}

export default function ProjectForm({
  onSubmit,
  onCancel,
  loading,
  initialData,
}: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    research_goal: initialData?.research_goal || "",
    project_type: initialData?.project_type || "",
    stakeholder_type: initialData?.stakeholder_type || "",
    country: initialData?.country || "",
    therapy_area: initialData?.therapy_area || "",
    language: initialData?.language
      ? Array.isArray(initialData.language)
        ? initialData.language
        : [initialData.language]
      : ["en"],
    guide_context: initialData?.guide_context || "",
    priority: initialData?.priority || "medium",
    deadline: initialData?.deadline
      ? new Date(initialData.deadline)
      : undefined,
    owner: initialData?.owner || "",
    transcript_format: initialData?.transcript_format || "diarized",
    rfp_summary: initialData?.rfp_summary || "",
    research_hypothesis: initialData?.research_hypothesis || "",
    research_dictionary: initialData?.research_dictionary || "",
    guided_themes: initialData?.guided_themes || [],
    transcripts: [],
  });

  const [newGuidedTheme, setNewGuidedTheme] = useState("");
  const [parsedGuide, setParsedGuide] = useState<ParsedGuide | null>(null);
  const [parsingGuide, setParsingGuide] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If we have a parsed guide, use it as guide_context
    let finalGuideContext = formData.guide_context;
    if (parsedGuide) {
      finalGuideContext = JSON.stringify(parsedGuide);
    }
    
    // Convert language array to comma-separated string for backend
    const submitData = {
      ...formData,
      guide_context: finalGuideContext,
      language: formData.language.join(","),
    };
    await onSubmit(submitData);
  };

  const parseDiscussionGuide = async () => {
    const text = (formData.guide_context ?? '').trim();
    if (!text) {
      toast({
        title: "No Guide Content",
        description: "Please add some discussion guide content first.",
        variant: "destructive",
      });
      return;
    }

    setParsingGuide(true);
    try {
      console.log("Calling guide-parser with text length:", text.length);
      
      const { data, error } = await supabase.functions.invoke("guide-parser", {
        body: { text }, // Must be "text" property
      });

      // Surface server errors with context
      if (error) {
        throw new Error(`guide-parser failed: ${error.message ?? JSON.stringify(error)}`);
      }

      console.log("Guide parser response:", data);

      // Check for expected structure
      if (!data?.guide?.sections) {
        throw new Error(`guide-parser returned unexpected payload: ${JSON.stringify(data)}`);
      }

      // Convert the function response to match our ParsedGuide interface
      const parsedGuide: ParsedGuide = {
        sections: data.guide.sections,
        coverage: data.metrics?.coverage ? data.metrics.coverage * 100 : 0, // Convert to percentage
        totalQuestions: data.metrics?.extractedQuestions || 0,
        rawQL: data.metrics?.candidateQuestionLines || 0
      };
      setParsedGuide(parsedGuide);
      
      // CRITICAL FIX: Save the structured guide data back to formData.guide_context
      // This ensures the content analysis function can access the parsed questions
      const structuredGuideData = JSON.stringify(data.guide, null, 2);
      updateFormData("guide_context", structuredGuideData);
      
      toast({
        title: "Guide Parsed Successfully!",
        description: `${data.metrics?.extractedQuestions || 0} questions found with ${((data.metrics?.coverage || 0) * 100).toFixed(1)}% coverage - Ready for Content Analysis!`,
      });
    } catch (error) {
      console.error("Guide parsing error:", error);
      toast({
        title: "Parsing Failed",
        description: error instanceof Error ? error.message : "Failed to parse discussion guide",
        variant: "destructive",
      });
    } finally {
      setParsingGuide(false);
    }
  };

  const updateFormData = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files using the service
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
      console.warn(
        `${invalidCount} file(s) were rejected due to unsupported format`,
      );
    }

    setFormData((prev) => ({
      ...prev,
      transcripts: [...prev.transcripts, ...validFiles],
    }));
  }, []);

  // Generate dropzone accept configuration from our file configs
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

  const addGuidedTheme = () => {
    if (
      newGuidedTheme.trim() &&
      !formData.guided_themes?.includes(newGuidedTheme.trim())
    ) {
      updateFormData("guided_themes", [
        ...(formData.guided_themes || []),
        newGuidedTheme.trim(),
      ]);
      setNewGuidedTheme("");
    }
  };

  const removeGuidedTheme = (theme: string) => {
    updateFormData(
      "guided_themes",
      formData.guided_themes?.filter((t) => t !== theme) || [],
    );
  };

  const removeTranscript = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      transcripts: prev.transcripts.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Project Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Project Owner</Label>
            <Input
              id="owner"
              value={formData.owner}
              onChange={(e) => updateFormData("owner", e.target.value)}
              placeholder="Project owner name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData("description", e.target.value)}
            placeholder="Brief project description"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="research_goal">Research Goal</Label>
          <Textarea
            id="research_goal"
            value={formData.research_goal}
            onChange={(e) => updateFormData("research_goal", e.target.value)}
            placeholder="What are the key objectives of this research?"
            rows={3}
          />
        </div>
      </div>

      {/* FMR Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">FMR Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="project_type">Project Type *</Label>
            <Select
              value={formData.project_type}
              onValueChange={(value) => updateFormData("project_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_TYPE_CATEGORIES).map(
                  ([category, types]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        {category}
                      </div>
                      {Object.entries(types).map(([label, value]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </div>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stakeholder_type">Stakeholder Type</Label>
            <Input
              id="stakeholder_type"
              value={formData.stakeholder_type}
              onChange={(e) =>
                updateFormData("stakeholder_type", e.target.value)
              }
              placeholder="e.g., HCP, Patient, Payer, Internal, KOL, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => updateFormData("country", e.target.value)}
              placeholder="e.g., Germany, United States"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="therapy_area">Therapy Area</Label>
            <Input
              id="therapy_area"
              value={formData.therapy_area}
              onChange={(e) => updateFormData("therapy_area", e.target.value)}
              placeholder="e.g., Oncology, Cardiology"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Languages</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.language.map((lang, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                  >
                    <span>
                      {AVAILABLE_LANGUAGES.find((l) => l.code === lang)?.name ||
                        lang.toUpperCase()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-primary/20"
                      onClick={() => {
                        const newLanguages = formData.language.filter(
                          (_, i) => i !== index,
                        );
                        updateFormData(
                          "language",
                          newLanguages.length > 0 ? newLanguages : ["en"],
                        );
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.language.includes(value)) {
                    updateFormData("language", [...formData.language, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add language" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_LANGUAGES.filter(
                    (lang) => !formData.language.includes(lang.code),
                  ).map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => updateFormData("priority", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.deadline && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.deadline
                  ? format(formData.deadline, "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.deadline}
                onSelect={(date) => updateFormData("deadline", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Research Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Research Context</h3>

        <div className="space-y-2">
          <Label htmlFor="guide_context">Discussion Guide</Label>
          <div className="space-y-3">
            <Textarea
              id="guide_context"
              value={formData.guide_context}
              onChange={(e) => updateFormData("guide_context", e.target.value)}
              placeholder="Paste your discussion guide here... (Best: Copy from Word/PDF to preserve formatting)"
              rows={6}
            />

            {/* File Upload for Discussion Guide */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <label
                  htmlFor="guide-file-upload"
                  className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Click to upload Discussion Guide file</span>
                </label>
                <input
                  id="guide-file-upload"
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        updateFormData("guide_context", content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </div>
              <div className="text-xs text-center text-muted-foreground mt-1">
                Supports PDF, TXT, and Word formats
              </div>
            </div>

            {/* Parse Guide Button */}
            <Button
              type="button"
              onClick={parseDiscussionGuide}
              disabled={parsingGuide || !formData.guide_context.trim()}
              className="w-full"
            >
              {parsingGuide ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Parsing Guide...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Parse Discussion Guide
                </>
              )}
            </Button>

            {/* Parsing Results */}
            {parsedGuide && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Guide Parsed Successfully!</span>
                    <Badge variant="secondary" className="text-green-700">
                      {parsedGuide.coverage}% Coverage
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Sections:</span> {parsedGuide.sections.length}
                    </div>
                    <div>
                      <span className="font-medium">Questions:</span> {parsedGuide.totalQuestions}
                    </div>
                    <div>
                      <span className="font-medium">Raw Q's:</span> {parsedGuide.rawQL}
                    </div>
                  </div>
                  <Progress value={parsedGuide.coverage} className="mt-2" />
                </AlertDescription>
              </Alert>
            )}

            {/* TEMPORARY: Detailed Parsed Data Structure */}
            {parsedGuide && (
              <div className="mt-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-800">🔍 TEMPORARY: Parsed Data Structure</h4>
                  <Badge variant="outline" className="text-blue-600">Debug View</Badge>
                </div>
                
                <div className="space-y-3">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <span className="font-medium text-gray-700">Total Sections:</span> {parsedGuide.sections.length}
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="font-medium text-gray-700">Total Questions:</span> {parsedGuide.totalQuestions}
                    </div>
                  </div>

                  {/* Detailed Sections */}
                  <div className="bg-white p-3 rounded border max-h-60 overflow-y-auto">
                    <h5 className="font-medium text-gray-700 mb-2">📋 Parsed Sections:</h5>
                    {parsedGuide.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="mb-3 p-2 bg-gray-50 rounded">
                        <div className="font-medium text-blue-600 mb-1">
                          Section {sectionIndex + 1}: {section.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          Questions: {section.questions?.length || 0}
                        </div>
                        {section.questions && section.questions.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {section.questions.slice(0, 3).map((question, qIndex) => (
                              <div key={qIndex} className="text-xs bg-white p-1 rounded border-l-2 border-blue-300">
                                {qIndex + 1}. {question.text}
                              </div>
                            ))}
                            {section.questions.length > 3 && (
                              <div className="text-xs text-gray-500 italic">
                                ... and {section.questions.length - 3} more questions
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Raw JSON Structure */}
                  <details className="bg-white p-3 rounded border">
                    <summary className="font-medium text-gray-700 cursor-pointer">
                      🔧 Raw JSON Structure (Click to expand)
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(parsedGuide, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rfp_summary">RFP Summary</Label>
          <Textarea
            id="rfp_summary"
            value={formData.rfp_summary}
            onChange={(e) => updateFormData("rfp_summary", e.target.value)}
            placeholder="Key research questions and objectives from RFP..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="research_hypothesis">Research Hypothesis</Label>
          <Textarea
            id="research_hypothesis"
            value={formData.research_hypothesis || ""}
            onChange={(e) =>
              updateFormData("research_hypothesis", e.target.value)
            }
            placeholder="State your research hypothesis for validation in advanced analysis mode..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This will be used for hypothesis validation in advanced analysis
            mode
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="research_dictionary">Research Dictionary</Label>
          <Textarea
            id="research_dictionary"
            value={formData.research_dictionary || ""}
            onChange={(e) =>
              updateFormData("research_dictionary", e.target.value)
            }
            placeholder="Define key terms, brands, medical terminology, acronyms relevant to your research...\n\nExample:\n- Brand X: Leading wound care solution\n- HCP: Healthcare Professional\n- Debridement: Removal of damaged tissue"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Key terms will be auto-linked in advanced analysis for contextual
            explanations
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guided_themes">Guided Themes</Label>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add specific themes you want the analysis to focus on. These will
              be used in advanced analysis to guide theme extraction.
            </p>

            {/* Manual Theme Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a guided theme..."
                value={newGuidedTheme}
                onChange={(e) => setNewGuidedTheme(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addGuidedTheme()}
              />
              <Button type="button" onClick={addGuidedTheme}>
                Add Theme
              </Button>
            </div>

            {formData.guided_themes && formData.guided_themes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Guided Themes ({formData.guided_themes.length})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFormData("guided_themes", [])}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.guided_themes.map((theme, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                    >
                      <span>{theme}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-primary/20"
                        onClick={() => removeGuidedTheme(theme)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="h-8 w-8 bg-muted-foreground/20 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-muted-foreground text-lg">🧠</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  No guided themes added yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Add themes manually or they will be extracted from the
                  discussion guide during analysis
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transcript_format">Transcript Format</Label>
          <Select
            value={formData.transcript_format}
            onValueChange={(value) =>
              updateFormData("transcript_format", value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diarized">Diarized (I: R: format)</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="timestamped">Timestamped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Document Files (Optional)</h3>

        {/* Document Upload Info */}
        <Alert className="border-primary/50 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-primary">
                📄 Document Upload for FMR Analysis
              </p>
              <p className="text-sm">
                Upload research documents including transcripts, discussion
                guides, or other relevant materials for your FMR project
                analysis.
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, TXT, DOC, DOCX. Documents will be stored
                securely and associated with your project.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/25 hover:border-primary/50",
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <div>
              <p className="text-sm font-medium">
                Drag & drop document files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports: PDF, TXT, DOC, DOCX
              </p>
            </div>
          )}
        </div>

        {formData.transcripts.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({formData.transcripts.length})</Label>
            {formData.transcripts.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded"
              >
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTranscript(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={!formData.name || !formData.project_type || loading}
        >
          {loading
            ? initialData
              ? "Updating..."
              : "Creating..."
            : initialData
              ? "Update Project"
              : "Create Project"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
