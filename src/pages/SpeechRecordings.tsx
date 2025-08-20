import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileAudio, Play, Download, Trash2, Eye, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SpeechProject {
  id: string;
  name: string;
  language: string;
}

interface SpeechRecording {
  id: string;
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
  updated_at: string;
}

const SpeechRecordings: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<SpeechProject | null>(null);
  const [recordings, setRecordings] = useState<SpeechRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<SpeechRecording | null>(null);
  const [isTranscriptDialogOpen, setIsTranscriptDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadRecordings();
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

  const loadRecordings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('speech_recordings')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recordings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRecording = async (recordingId: string) => {
    try {
      const { error } = await supabase
        .from('speech_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Recording deleted successfully'
      });

      loadRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete recording',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading recordings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recordings</h1>
          <p className="text-muted-foreground">
            View and manage recordings for project: {project?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/speech/${projectId}/upload`)}
          >
            Upload New
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/speech')}
          >
            Back to Projects
          </Button>
        </div>
      </div>

      {recordings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FileAudio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload your first audio file to start transcribing
            </p>
            <Button onClick={() => navigate(`/dashboard/speech/${projectId}/upload`)}>
              Upload First Recording
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recordings.map((recording) => (
            <Card key={recording.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(recording.status)}
                      <h3 className="font-semibold">{recording.file_name}</h3>
                      {getStatusBadge(recording.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Size:</span> {formatFileSize(recording.file_size)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {formatDuration(recording.duration_seconds)}
                      </div>
                      <div>
                        <span className="font-medium">Language:</span> {getLanguageDisplayName(recording.language_detected || recording.language)}
                      </div>
                      <div>
                        <span className="font-medium">Speakers:</span> {recording.speaker_count || 'Unknown'}
                      </div>
                    </div>

                    {recording.confidence_score && (
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground">Confidence: </span>
                        <span className="text-sm font-medium">
                          {(recording.confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {recording.status === 'completed' && recording.transcript_text && (
                      <Dialog open={isTranscriptDialogOpen} onOpenChange={setIsTranscriptDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRecording(recording)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Transcript: {recording.file_name}</DialogTitle>
                            <DialogDescription>
                              Language: {getLanguageDisplayName(recording.language_detected || recording.language)} | 
                              Confidence: {(recording.confidence_score || 0) * 100}% | 
                              Duration: {formatDuration(recording.duration_seconds)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4">
                            <Tabs defaultValue="transcript" className="w-full">
                              <TabsList>
                                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                                <TabsTrigger value="details">Details</TabsTrigger>
                              </TabsList>
                              <TabsContent value="transcript" className="mt-4">
                                <div className="bg-muted/30 p-4 rounded-lg">
                                  <pre className="whitespace-pre-wrap text-sm font-mono">
                                    {recording.transcript_text}
                                  </pre>
                                </div>
                              </TabsContent>
                              <TabsContent value="details" className="mt-4">
                                <div className="space-y-2 text-sm">
                                  <div><strong>File Name:</strong> {recording.file_name}</div>
                                  <div><strong>File Size:</strong> {formatFileSize(recording.file_size)}</div>
                                  <div><strong>Duration:</strong> {formatDuration(recording.duration_seconds)}</div>
                                  <div><strong>Language:</strong> {getLanguageDisplayName(recording.language_detected || recording.language)}</div>
                                  <div><strong>Speakers:</strong> {recording.speaker_count || 'Unknown'}</div>
                                  <div><strong>Confidence:</strong> {(recording.confidence_score || 0) * 100}%</div>
                                  <div><strong>Created:</strong> {new Date(recording.created_at).toLocaleString()}</div>
                                  <div><strong>Updated:</strong> {new Date(recording.updated_at).toLocaleString()}</div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Download transcript as text file
                        if (recording.transcript_text) {
                          const blob = new Blob([recording.transcript_text], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${recording.file_name}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }
                      }}
                      disabled={!recording.transcript_text}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRecording(recording.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpeechRecordings; 