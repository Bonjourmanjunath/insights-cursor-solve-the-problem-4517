import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, FileText, Play, Calendar, Clock, Info, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import FileUploadService, { UploadProgress, FILE_TYPE_CONFIGS } from "@/services/file-upload-service";

interface Document {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  duration_seconds?: number;
  language_detected?: string;
  project_number?: string;
  market?: string;
  respondent_initials?: string;
  specialty?: string;
}

const languages = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' }
];

export default function ProjectTranscripts() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [uploadProgresses, setUploadProgresses] = useState<Record<string, UploadProgress>>({});
  const [selectedLanguage, setSelectedLanguage] = useState('auto');

  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
      return;
    }
    
    fetchProjectAndDocuments();
  }, [projectId]);

  const fetchProjectAndDocuments = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('research_projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (projectError) {
        throw new Error('Project not found');
      }

      setProjectName(project.name);

      // Fetch documents for this project (changed from transcripts to research_documents)
      const { data: documentData, error: documentError } = await supabase
        .from('research_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('upload_date', { ascending: false });

      if (documentError) {
        throw new Error('Failed to fetch documents');
      }

      // Map documents to transcript format for display compatibility
      const mappedDocuments = (documentData || []).map(doc => ({
        id: doc.id,
        file_name: doc.name,
        status: doc.processing_status,
        created_at: doc.upload_date,
        duration_seconds: null,
        language_detected: null,
        project_number: null,
        market: null,
        respondent_initials: null,
        specialty: null
      }));

      setDocuments(mappedDocuments);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('📁 Files dropped:', acceptedFiles);
    
    if (!isAuthenticated || !user || !projectId) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload files",
        variant: "destructive"
      });
      return;
    }

    // Process each file using the new service
    for (const file of acceptedFiles) {
      try {
        // Validate file first
        const validation = FileUploadService.validateFile(file);
        if (!validation.valid) {
          toast({
            title: "Invalid file",
            description: validation.error,
            variant: "destructive"
          });
          continue;
        }

        console.log('📤 Processing file:', file.name, 'Type:', file.type);

        // Handle progress updates
        const handleProgress = (progress: UploadProgress) => {
          setUploadProgresses(prev => ({
            ...prev,
            [progress.fileId]: progress
          }));
        };

        // Upload file with transcript creation
        const result = await FileUploadService.uploadFileWithDocument(
          file,
          user.id,
          projectId,
          handleProgress
        );

        if (result.success) {
          console.log('✅ Upload completed successfully:', result.document?.id);
          toast({
            title: "Upload successful",
            description: `${file.name} uploaded successfully`,
          });
        } else {
          throw new Error(result.error || 'Upload failed');
        }

      } catch (error) {
        console.error('❌ Upload error:', error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
    }

    // Refresh documents after upload
    fetchProjectAndDocuments();
    
    // Clear upload progresses after a delay
    setTimeout(() => {
      setUploadProgresses({});
    }, 3000);
    
  }, [isAuthenticated, user, projectId, toast]);

  const processTranscription = async (transcriptId: string, filePath: string) => {
    try {
      const { data: speechData, error: speechError } = await supabase.functions.invoke('azure-speech-transcribe', {
        body: {
          transcriptId,
          filePath,
          language: selectedLanguage === 'auto' ? undefined : selectedLanguage
        }
      });

      if (speechError || !speechData?.success) {
        throw new Error(speechError?.message || 'Failed to start transcription');
      }

      if (speechData.fastProcessing && speechData.text) {
        toast({
          title: "⚡ Fast transcription completed!",
          description: "Your audio has been transcribed in seconds!",
        });
        fetchProjectAndDocuments(); // Refresh the list
      }

    } catch (error) {
      console.error('Transcription error:', error);
      await supabase
        .from('transcripts')
        .update({ status: 'error' })
        .eq('id', transcriptId);

      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Failed to start transcription",
        variant: "destructive"
      });
    }
  };

  // Generate dropzone accept configuration from our file configs
  const dropzoneAccept = Object.values(FILE_TYPE_CONFIGS).reduce((acc, config) => {
    config.mimeTypes.forEach(mimeType => {
      if (!acc[mimeType]) {
        acc[mimeType] = [];
      }
      acc[mimeType].push(...config.extensions);
    });
    return acc;
  }, {} as Record<string, string[]>);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dropzoneAccept,
    multiple: true
  });

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
            {projectName} - Transcripts
          </h1>
          <p className="text-muted-foreground">
            Upload and manage transcripts for this project
          </p>
        </div>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="shadow-md border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Transcripts for {projectName}
            </CardTitle>
            <CardDescription>
              Upload audio files or pre-existing transcript documents to this project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Transcript Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Diarized Format Recommendation */}
            <Alert className="border-primary/50 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-primary">📝 Recommended: Use Diarized Format for Best Results</p>
                  <p className="text-sm">
                    For optimal FMR analysis with GPT-4.1, use the <strong>Diarized format (I: R:)</strong> in your transcripts:
                  </p>
                  <div className="bg-background/50 rounded p-2 text-xs font-mono space-y-1">
                    <div><span className="text-primary font-semibold">I:</span> [Interviewer question goes here]</div>
                    <div><span className="text-primary font-semibold">R:</span> [Respondent answer goes here]</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This structured format helps GPT-4.1 accurately distinguish speakers and extract quotes for better FMR Dish analysis.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Upload Area */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-sm font-medium">Drag & drop transcript files here, or click to select</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports Audio: MP3, WAV, M4A, OGG, FLAC, WMA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Documents: PDF, TXT, DOC, DOCX
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress Display */}
            {Object.keys(uploadProgresses).length > 0 && (
              <div className="space-y-3">
                <Label>Upload Progress</Label>
                {Object.values(uploadProgresses).map((progress) => (
                  <div key={progress.fileId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{progress.fileName}</span>
                      <div className="flex items-center gap-2">
                        {progress.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {progress.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground capitalize">
                          {progress.status}
                        </span>
                      </div>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                    {progress.error && (
                      <p className="text-xs text-red-500">{progress.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transcripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading transcripts...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transcripts yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first transcript to get started with analysis.
              </p>
            </div>
          </div>
        ) : (
          documents.map((transcript, index) => (
            <motion.div
              key={transcript.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{transcript.file_name}</CardTitle>
                        <CardDescription className="text-sm">
                          {transcript.respondent_initials && `${transcript.respondent_initials} • `}
                          {transcript.specialty || 'No specialty specified'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(transcript.status)}>
                      {transcript.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {transcript.project_number && (
                        <div>
                          <span className="font-medium text-muted-foreground">Project #:</span>
                          <span className="ml-2">{transcript.project_number}</span>
                        </div>
                      )}
                      {transcript.market && (
                        <div>
                          <span className="font-medium text-muted-foreground">Market:</span>
                          <span className="ml-2">{transcript.market}</span>
                        </div>
                      )}
                      {transcript.language_detected && (
                        <div>
                          <span className="font-medium text-muted-foreground">Language:</span>
                          <span className="ml-2">{transcript.language_detected.toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-muted-foreground">Duration:</span>
                        <span className="ml-2">{formatDuration(transcript.duration_seconds)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(transcript.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(transcript.created_at).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Play className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}