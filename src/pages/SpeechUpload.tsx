import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Mic, FileAudio, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SpeechProject {
  id: string;
  name: string;
  language: string;
}

interface MedicalTerm {
  id: string;
  term: string;
  category: string;
}

const SpeechUpload: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<SpeechProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [medicalTerms, setMedicalTerms] = useState<MedicalTerm[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [processingOptions, setProcessingOptions] = useState({
    noise_reduction: true,
    volume_normalization: true,
    speaker_diarization: false,
    medical_enhancement: false,
    quality_assessment: true
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadMedicalTerms();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('speech-project-manager', {
        body: {
          action: 'get',
          project_id: projectId
        }
      });

      if (error) throw error;
      setProject(data.project);
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project details',
        variant: 'destructive'
      });
    }
  };

  const loadMedicalTerms = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('medical-dictionary-sync', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setMedicalTerms(data.terms || []);
    } catch (error) {
      console.error('Error loading medical terms:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/mp4', 'video/mp4', 'video/mov'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an audio or video file',
          variant: 'destructive'
        });
        return;
      }

      // Validate file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'File size must be less than 500MB',
          variant: 'destructive'
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const uploadAndTranscribe = async () => {
    if (!selectedFile || !project) return;

    setUploading(true);
    setProgress(0);

    try {
      // Convert file to base64
      setProgress(10);
      const audioData = await convertFileToBase64(selectedFile);
      setProgress(20);

      // Start transcription
      setProgress(30);
      const { data, error } = await supabase.functions.invoke('speech-transcriber', {
        body: {
          project_id: projectId,
          file_name: selectedFile.name,
          audio_data: audioData,
          language: project.language,
          medical_terms: selectedTerms
        }
      });

      if (error) throw error;
      setProgress(80);

      // Process audio if options are selected
      if (Object.values(processingOptions).some(option => option)) {
        setProgress(90);
        await supabase.functions.invoke('audio-processor', {
          body: {
            recording_id: data.recording_id,
            processing_options: processingOptions
          }
        });
      }

      setProgress(100);

      toast({
        title: 'Success',
        description: 'Audio uploaded and transcribed successfully'
      });

      // Navigate to recordings page
      navigate(`/dashboard/speech/${projectId}/recordings`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload and transcribe audio',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const getLanguageDisplayName = (code: string) => {
    const languages: { [key: string]: string } = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese (Brazil)',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'ru-RU': 'Russian',
      'ar-SA': 'Arabic'
    };
    return languages[code] || code;
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Audio</h1>
          <p className="text-muted-foreground">
            Upload and transcribe audio files for project: {project.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/dashboard/speech/${projectId}/recordings`)}
        >
          View Recordings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              File Upload
            </CardTitle>
            <CardDescription>
              Select an audio or video file to transcribe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="audio-file">Audio/Video File</Label>
              <Input
                id="audio-file"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: MP3, WAV, M4A, MP4, MOV (max 500MB)
              </p>
            </div>

            {selectedFile && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center">
                  <FileAudio className="mr-2 h-4 w-4" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Project Language</Label>
              <div className="mt-1">
                <Badge variant="secondary">
                  {getLanguageDisplayName(project.language)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Processing Options
            </CardTitle>
            <CardDescription>
              Configure audio processing and enhancement options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="noise-reduction"
                  checked={processingOptions.noise_reduction}
                  onCheckedChange={(checked) =>
                    setProcessingOptions({ ...processingOptions, noise_reduction: !!checked })
                  }
                />
                <Label htmlFor="noise-reduction">Noise Reduction</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="volume-normalization"
                  checked={processingOptions.volume_normalization}
                  onCheckedChange={(checked) =>
                    setProcessingOptions({ ...processingOptions, volume_normalization: !!checked })
                  }
                />
                <Label htmlFor="volume-normalization">Volume Normalization</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="speaker-diarization"
                  checked={processingOptions.speaker_diarization}
                  onCheckedChange={(checked) =>
                    setProcessingOptions({ ...processingOptions, speaker_diarization: !!checked })
                  }
                />
                <Label htmlFor="speaker-diarization">Speaker Diarization</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="medical-enhancement"
                  checked={processingOptions.medical_enhancement}
                  onCheckedChange={(checked) =>
                    setProcessingOptions({ ...processingOptions, medical_enhancement: !!checked })
                  }
                />
                <Label htmlFor="medical-enhancement">Medical Enhancement</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quality-assessment"
                  checked={processingOptions.quality_assessment}
                  onCheckedChange={(checked) =>
                    setProcessingOptions({ ...processingOptions, quality_assessment: !!checked })
                  }
                />
                <Label htmlFor="quality-assessment">Quality Assessment</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Terms Section */}
      {medicalTerms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mic className="mr-2 h-5 w-5" />
              Medical Terms
            </CardTitle>
            <CardDescription>
              Select medical terms to enhance transcription accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {medicalTerms.map((term) => (
                <div key={term.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={term.id}
                    checked={selectedTerms.includes(term.term)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTerms([...selectedTerms, term.term]);
                      } else {
                        setSelectedTerms(selectedTerms.filter(t => t !== term.term));
                      }
                    }}
                  />
                  <Label htmlFor={term.id} className="text-sm">
                    {term.term}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {term.category}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      <div className="flex justify-end">
        <Button
          onClick={uploadAndTranscribe}
          disabled={!selectedFile || uploading}
          className="min-w-[200px]"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Transcribe
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SpeechUpload; 