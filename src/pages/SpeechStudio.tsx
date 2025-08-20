import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  Upload, 
  Play, 
  Pause, 
  Download, 
  Edit, 
  Trash2, 
  FileAudio, 
  Settings,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Languages,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SpeechProject {
  id: string;
  name: string;
  description?: string;
  language: string;
  recording_count: number;
  created_at: string;
}

interface SpeechRecording {
  id: string;
  project_id: string;
  file_name: string;
  file_size: number;
  language: string;
  status: 'processing' | 'completed' | 'error';
  duration_seconds?: number;
  speaker_count?: number;
  transcript_text?: string;
  language_detected?: string;
  confidence_score?: number;
  created_at: string;
}

interface MedicalTerm {
  id: string;
  term: string;
  pronunciation?: string;
  category: string;
  definition?: string;
}

const languages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'ko-KR', name: 'Korean (Korea)' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' }
];

export default function SpeechStudio() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [projects, setProjects] = useState<SpeechProject[]>([]);
  const [recordings, setRecordings] = useState<SpeechRecording[]>([]);
  const [medicalTerms, setMedicalTerms] = useState<MedicalTerm[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState('en-US');
  
  // Medical dictionary form
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newTermCategory, setNewTermCategory] = useState('drug');
  const [newTermDefinition, setNewTermDefinition] = useState('');

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadRealData();
    }
  }, [isAuthenticated, user]);

  const loadRealData = async () => {
    try {
      setLoading(true);
      
      // Load projects from database
      const { data: projectsData, error: projectsError } = await supabase
        .from('speech_projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
      } else {
        setProjects(projectsData || []);
        if (projectsData && projectsData.length > 0 && !selectedProject) {
          setSelectedProject(projectsData[0].id);
        }
      }

      // Load recordings from database
      const { data: recordingsData, error: recordingsError } = await supabase
        .from('speech_recordings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (recordingsError) {
        console.error('Error loading recordings:', recordingsError);
      } else {
        setRecordings(recordingsData || []);
      }

      // Load medical terms from database
      const { data: termsData, error: termsError } = await supabase
        .from('medical_dictionaries')
        .select('*')
        .eq('user_id', user?.id)
        .order('term', { ascending: true });

      if (termsError) {
        console.error('Error loading medical terms:', termsError);
      } else {
        setMedicalTerms(termsData || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load projects and recordings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('speech-project-manager', {
        body: {
          action: 'create',
          project: {
            name: newProjectName,
            description: newProjectDescription,
            language: newProjectLanguage,
            user_id: user?.id
          }
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to create project');
      }

      setProjects(prev => [data.project, ...prev]);
      setSelectedProject(data.project.id);
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectLanguage('en-US');

      toast({
        title: "Success",
        description: "Project created successfully",
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const addMedicalTerm = async () => {
    if (!newTerm.trim()) {
      toast({
        title: "Error",
        description: "Term is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('medical-dictionary-sync', {
        body: {
          action: 'create',
          term: {
            term: newTerm,
            category: newTermCategory,
            definition: newTermDefinition,
            user_id: user?.id
          }
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to add term');
      }

      setMedicalTerms(prev => [...prev, data.term]);
      setShowAddTerm(false);
      setNewTerm('');
      setNewTermDefinition('');

      toast({
        title: "Success",
        description: "Medical term added successfully",
      });
    } catch (error) {
      console.error('Error adding medical term:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add medical term",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      return;
    }

    for (const file of acceptedFiles) {
      try {
        setUploading(true);
        setUploadProgress(0);

        console.log('Processing file:', file.name);
        console.log('Project:', selectedProject);
        console.log('Medical terms:', medicalTerms.length);

        // Convert file to base64 for Azure Speech API
        const arrayBuffer = await file.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Get medical terms for this project to improve transcription accuracy
        const projectMedicalTerms = medicalTerms.map(term => term.term);

        setUploadProgress(25);

        // Call the real Azure Speech transcription service
        const { data, error } = await supabase.functions.invoke('speech-transcriber', {
          body: {
            project_id: selectedProject,
            file_name: file.name,
            audio_data: base64Audio,
            language: selectedLanguage,
            medical_terms: projectMedicalTerms
          }
        });

        if (error) {
          throw new Error(`Transcription failed: ${error.message}`);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Transcription failed');
        }

        setUploadProgress(100);

        console.log('File processed successfully:', data.recording);

        // Add to recordings list
        setRecordings(prev => [data.recording, ...prev]);

        toast({
          title: "Success",
          description: `${file.name} transcribed successfully`,
        });

      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Failed to process file",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  }, [selectedProject, selectedLanguage, medicalTerms, isAuthenticated, user, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.mp4'],
      'video/*': ['.mp4', '.mov']
    },
    multiple: true,
    disabled: uploading || !selectedProject
  });

  const exportTranscript = async (recording: SpeechRecording, format: 'pdf' | 'docx' | 'txt') => {
    try {
      const { data, error } = await supabase.functions.invoke('export-transcript', {
        body: {
          recording_id: recording.id,
          format,
          include_metadata: true,
          include_timestamps: true
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Export failed');
      }

      // Create download link
      const blob = new Blob([atob(data.file)], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
              'text/plain'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Transcript exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export transcript",
        variant: "destructive",
      });
    }
  };

  const deleteRecording = async (recordingId: string) => {
    try {
      const { error } = await supabase
        .from('speech_recordings')
        .delete()
        .eq('id', recordingId)
        .eq('user_id', user?.id);

      if (error) {
        throw new Error(error.message);
      }

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      
      toast({
        title: "Success",
        description: "Recording deleted successfully",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete recording",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access Speech Studio
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Speech Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight mb-2">Speech Studio</h1>
          <p className="text-muted-foreground">
            Professional speech-to-text transcription with Azure Speech Services
          </p>
        </motion.div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Record & Upload
            </TabsTrigger>
            <TabsTrigger value="recordings" className="flex items-center gap-2">
              <FileAudio className="h-4 w-4" />
              Recordings
            </TabsTrigger>
            <TabsTrigger value="dictionary" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Medical Dictionary
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {/* Project Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Project Configuration
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewProject(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue />
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

                {/* New Project Form */}
                {showNewProject && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Create New Project</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewProject(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input
                          placeholder="Enter project name"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Default Language</Label>
                        <Select value={newProjectLanguage} onValueChange={setNewProjectLanguage}>
                          <SelectTrigger>
                            <SelectValue />
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
                    
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        placeholder="Project description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <Button onClick={createProject} className="w-full">
                      Create Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Audio Files</CardTitle>
                <CardDescription>
                  Upload audio or video files for transcription with Azure Speech Services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  } ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-lg">Drop files here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Drag & drop audio files here, or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Supports: MP3, WAV, M4A, MP4, MOV • Max size: 500MB
                      </p>
                      {!selectedProject && (
                        <p className="text-sm text-destructive">
                          Please select a project first
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading and transcribing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recordings Tab */}
          <TabsContent value="recordings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recordings ({recordings.length})</CardTitle>
                <CardDescription>
                  Manage your transcribed recordings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recordings.length === 0 ? (
                  <div className="text-center py-12">
                    <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
                    <p className="text-muted-foreground">
                      Upload your first audio file to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recordings.map(recording => (
                      <div key={recording.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium mb-2">{recording.file_name}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Duration: {formatDuration(recording.duration_seconds)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Languages className="h-3 w-3" />
                                Language: {recording.language_detected || recording.language}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(recording.created_at), 'MMM dd, yyyy')}
                              </div>
                              <div>
                                Speakers: {recording.speaker_count || 'Unknown'}
                              </div>
                            </div>
                            
                            {recording.transcript_text && (
                              <div className="mt-4">
                                <h5 className="font-medium mb-2">Transcript Preview</h5>
                                <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
                                  <pre className="whitespace-pre-wrap font-mono">
                                    {recording.transcript_text.substring(0, 300)}
                                    {recording.transcript_text.length > 300 && '...'}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant={getStatusColor(recording.status)}>
                              {recording.status}
                            </Badge>
                            
                            {recording.status === 'completed' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => exportTranscript(recording, 'pdf')}
                                >
                                  PDF
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => exportTranscript(recording, 'docx')}
                                >
                                  Word
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => exportTranscript(recording, 'txt')}
                                >
                                  Text
                                </Button>
                              </>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRecording(recording.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Dictionary Tab */}
          <TabsContent value="dictionary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Medical Dictionary ({medicalTerms.length})
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddTerm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Term
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage medical terminology for enhanced transcription accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add Term Form */}
                {showAddTerm && (
                  <div className="border rounded-lg p-4 mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Add Medical Term</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddTerm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Term</Label>
                        <Input
                          placeholder="Enter medical term"
                          value={newTerm}
                          onChange={(e) => setNewTerm(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={newTermCategory} onValueChange={setNewTermCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="drug">Drug</SelectItem>
                            <SelectItem value="condition">Condition</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="brand">Brand</SelectItem>
                            <SelectItem value="acronym">Acronym</SelectItem>
                            <SelectItem value="anatomy">Anatomy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Definition (Optional)</Label>
                      <Textarea
                        placeholder="Enter definition"
                        value={newTermDefinition}
                        onChange={(e) => setNewTermDefinition(e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <Button onClick={addMedicalTerm} className="w-full">
                      Add Term
                    </Button>
                  </div>
                )}

                {/* Medical Terms List */}
                {medicalTerms.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No medical terms yet</h3>
                    <p className="text-muted-foreground">
                      Add medical terms to improve transcription accuracy
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {medicalTerms.map(term => (
                      <div key={term.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{term.term}</h4>
                            <Badge variant="outline" className="mt-1">
                              {term.category}
                            </Badge>
                            {term.definition && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {term.definition}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}