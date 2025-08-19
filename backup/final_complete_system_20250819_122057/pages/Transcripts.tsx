import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trash2, Download, Calendar, Clock, Languages, Upload, FileAudio, Play, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { EnhancedAudioPlayer } from '@/components/EnhancedAudioPlayer';
import { EditTranscriptDialog } from '@/components/EditTranscriptDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { ErrorHandler, ErrorUtils, ERROR_CODES } from '@/lib/error-handler';

interface Transcript {
  id: string;
  file_name: string;
  status: string;
  language_detected: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  transcript_content: string | null;
  original_text?: string | null;
  english_translation?: string | null;
  // Include other database fields to match the actual schema
  [key: string]: any;
}

export default function Transcripts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number | { status: string; error: string }>>({});
  const [editingTranscript, setEditingTranscript] = useState<Transcript | null>(null);
  const [exportingTranscript, setExportingTranscript] = useState<Transcript | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    for (const file of acceptedFiles) {
      try {
        // Validate file using centralized error handling
        ErrorUtils.validateFile(file);

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Create transcript record with error handling
        const transcript = await ErrorUtils.withErrorHandling(async () => {
          const { data, error } = await supabase
          .from('transcripts')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: '',
            status: 'uploading',
            progress: 0
          })
          .select()
          .single();

          if (error) throw error;
          return data;
        }, {
          operation: 'create_transcript_record',
          userId: user.id,
          additionalData: { fileName: file.name, fileSize: file.size }
        });

        // Upload file to storage with retry logic
        const uploadData = await ErrorUtils.withRetry(async () => {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
          const { data, error } = await supabase.storage
          .from('transcripts')
          .upload(fileName, file);

          if (error) throw error;
          return { data, fileName };
        }, 3, {
          operation: 'upload_file_to_storage',
          userId: user.id,
          filePath: file.name
        });

        // Update transcript with storage path
        await ErrorUtils.withErrorHandling(async () => {
          const { error } = await supabase
          .from('transcripts')
          .update({
              storage_path: uploadData.data.path,
            status: 'processing',
            progress: 100
          })
          .eq('id', transcript.id);

          if (error) throw error;
        }, {
          operation: 'update_transcript_storage_path',
          transcriptId: transcript.id,
          filePath: uploadData.data.path
        });

        // Start transcription processing with error handling
        await ErrorUtils.withErrorHandling(async () => {
          const { error } = await supabase.functions.invoke('azure-speech-transcribe', {
          body: {
            transcriptId: transcript.id,
              filePath: uploadData.data.path
          }
        });

          if (error) {
          // Update status to error if processing fails
          await supabase
            .from('transcripts')
            .update({ status: 'error' })
            .eq('id', transcript.id);
            throw error;
        }
        }, {
          operation: 'start_transcription_processing',
          transcriptId: transcript.id,
          filePath: uploadData.data.path
        });

        toast({
          title: "Upload Successful",
          description: `${file.name} uploaded and transcription started`,
        });

        // Remove from progress tracking
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });

      } catch (error) {
        // Handle error with centralized error handling
        const errorResponse = ErrorHandler.handleError(error, {
          operation: 'file_upload_process',
          userId: user.id,
          additionalData: { fileName: file.name }
        });

        toast({
          title: "Upload Failed",
          description: errorResponse.userMessage,
          variant: "destructive",
        });

        // Update progress to show error
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'error', error: errorResponse.userMessage }
        }));
      }
    }

    setUploading(false);
    fetchTranscripts(); // Refresh the list
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.mp4', '.wav', '.m4a'],
      'video/*': ['.mp4']
    },
    multiple: true,
    disabled: uploading
  });

  useEffect(() => {
    if (user) {
      fetchTranscripts();
    }
  }, [user]);

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const data = await ErrorUtils.withErrorHandling(async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
        return data || [];
      }, {
        operation: 'fetch_transcripts',
        userId: user?.id
      });

      setTranscripts(data);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, {
        operation: 'fetch_transcripts',
        userId: user?.id
      });

      toast({
        title: "Failed to Load Transcripts",
        description: errorResponse.userMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ErrorUtils.withErrorHandling(async () => {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      }, {
        operation: 'delete_transcript',
        transcriptId: id,
        userId: user?.id
      });

      setTranscripts(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Success",
        description: "Transcript deleted successfully",
      });
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, {
        operation: 'delete_transcript',
        transcriptId: id,
        userId: user?.id
      });

      toast({
        title: "Delete Failed",
        description: errorResponse.userMessage,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'uploading': return 'outline';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getLanguageName = (code: string | null) => {
    if (!code) return 'Unknown';
    const languages: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi'
    };
    return languages[code] || code.toUpperCase();
  };

  const getAudioUrl = async (transcript: Transcript) => {
    if (!transcript.storage_path) return null;
    
    try {
      const { data } = await supabase.storage
        .from('transcripts')
        .createSignedUrl(transcript.storage_path, 3600); // 1 hour expiry
      
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error generating audio URL:', error);
      return null;
    }
  };

  const handleEditTranscript = (transcript: Transcript) => {
    setEditingTranscript(transcript);
  };

  const handleExportTranscript = (transcript: Transcript) => {
    setExportingTranscript(transcript);
  };

  const handlePlayAudio = async (transcript: Transcript) => {
    const url = await getAudioUrl(transcript);
    if (url) {
      // AudioPlayer will handle the playback
      const audio = new Audio(url);
      audio.play().catch(console.error);
    } else {
      toast({
        title: "Error",
        description: "Audio file not available",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading transcripts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Transcripts</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage your audio transcripts with automatic language detection and translation
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Audio Files
          </CardTitle>
          <CardDescription>
            Drag & drop your audio/video files here. Supported formats: .mp3, .mp4, .wav, .m4a • Max file size: 500MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
              }
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <FileAudio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop your files here...</p>
            ) : (
              <>
                <p className="text-lg mb-2">Drag & drop audio/video files here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse your computer</p>
                <Button variant="secondary" disabled={uploading}>
                  Choose Files
                </Button>
              </>
            )}
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium">Uploading files...</h4>
              {Object.entries(uploadProgress).map(([fileName, progress]) => {
                const isError = typeof progress === 'object' && progress !== null && 'status' in progress;
                
                if (isError) {
                  return (
                    <div key={fileName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{fileName}</span>
                        <span className="text-destructive">Error</span>
                      </div>
                      <div className="text-sm text-destructive">
                        {(progress as { status: string; error: string }).error}
                      </div>
                    </div>
                  );
                }
                
                return (
                <div key={fileName} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{fileName}</span>
                      <span>{Math.round(progress as number)}%</span>
                    </div>
                    <Progress value={progress as number} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {transcripts.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No transcripts yet</h3>
              <p className="text-muted-foreground">
                Upload your first audio file to get started with AI transcription
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {transcripts.map((transcript) => (
            <Card key={transcript.id} className="w-full">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{transcript.display_name || transcript.file_name}</CardTitle>
                    {transcript.display_name && transcript.display_name !== transcript.file_name && (
                      <p className="text-sm text-muted-foreground mb-2">Original: {transcript.file_name}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created: {format(new Date(transcript.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Updated: {format(new Date(transcript.updated_at), 'HH:mm')}</span>
                      </div>
                      {transcript.duration_seconds && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Duration: {formatDuration(transcript.duration_seconds)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Languages className="h-4 w-4" />
                        <span>{getLanguageName(transcript.language_detected)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(transcript.status)}>
                      {transcript.status}
                    </Badge>
                    {transcript.status === 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlayAudio(transcript)}
                          title="Play audio"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTranscript(transcript)}
                          title="Edit metadata"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportTranscript(transcript)}
                          title="Export transcript"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(transcript.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete transcript"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {transcript.transcript_content && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Audio Player */}
                    {transcript.status === 'completed' && transcript.storage_path && (
                      <EnhancedAudioPlayer
                        storagePath={transcript.storage_path}
                        fileName={transcript.display_name || transcript.file_name}
                        className="mb-4"
                      />
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Formatted Transcript (I:/R:)</h4>
                      <div className="bg-muted p-4 rounded-md max-h-40 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {transcript.transcript_content.substring(0, 500)}
                          {transcript.transcript_content.length > 500 && '...'}
                        </pre>
                      </div>
                    </div>
                    
                    {transcript.original_text && transcript.english_translation && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Original ({getLanguageName(transcript.language_detected)})</h4>
                          <div className="bg-muted p-4 rounded-md max-h-32 overflow-y-auto">
                            <p className="text-sm">
                              {transcript.original_text.substring(0, 200)}
                              {transcript.original_text.length > 200 && '...'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">English Translation</h4>
                          <div className="bg-muted p-4 rounded-md max-h-32 overflow-y-auto">
                            <p className="text-sm">
                              {transcript.english_translation.substring(0, 200)}
                              {transcript.english_translation.length > 200 && '...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingTranscript && (
        <EditTranscriptDialog
          isOpen={!!editingTranscript}
          onClose={() => setEditingTranscript(null)}
          transcript={editingTranscript}
          onUpdate={() => {
            fetchTranscripts();
            setEditingTranscript(null);
          }}
        />
      )}

      {/* Export Dialog */}
      {exportingTranscript && (
        <ExportDialog
          isOpen={!!exportingTranscript}
          onClose={() => setExportingTranscript(null)}
          transcript={{
            id: exportingTranscript.id,
            file_name: exportingTranscript.file_name,
            display_name: exportingTranscript.display_name,
            transcript_content: exportingTranscript.transcript_content || '',
            duration_seconds: exportingTranscript.duration_seconds,
            speaker_count: exportingTranscript.speaker_count,
            language_detected: exportingTranscript.language_detected,
            created_at: exportingTranscript.created_at,
            project_number: exportingTranscript.project_number,
            market: exportingTranscript.market,
            interview_date: exportingTranscript.interview_date,
            respondent_initials: exportingTranscript.respondent_initials,
            specialty: exportingTranscript.specialty,
            metadata: {
              projectNumber: exportingTranscript.project_number,
              market: exportingTranscript.market,
              interviewDate: exportingTranscript.interview_date,
              respondentInitials: exportingTranscript.respondent_initials,
              specialty: exportingTranscript.specialty
            }
          }}
        />
      )}
    </div>
  );
}