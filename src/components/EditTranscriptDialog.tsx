import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TranscriptMetadata {
  id: string;
  file_name: string;
  display_name?: string;
  project_number?: string;
  market?: string;
  interview_date?: string;
  respondent_initials?: string;
  specialty?: string;
  audio_file_url?: string;
}

interface EditTranscriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptMetadata;
  onUpdate: () => void;
}

export function EditTranscriptDialog({ isOpen, onClose, transcript, onUpdate }: EditTranscriptDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [market, setMarket] = useState('');
  const [interviewDate, setInterviewDate] = useState<Date | undefined>();
  const [respondentInitials, setRespondentInitials] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Initialize form with existing data
  useEffect(() => {
    if (transcript && isOpen) {
      setDisplayName(transcript.display_name || transcript.file_name || '');
      setProjectNumber(transcript.project_number || '');
      setMarket(transcript.market || '');
      setInterviewDate(transcript.interview_date ? new Date(transcript.interview_date) : undefined);
      setRespondentInitials(transcript.respondent_initials || '');
      setSpecialty(transcript.specialty || '');
    }
  }, [transcript, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({
          display_name: displayName,
          project_number: projectNumber,
          market,
          interview_date: interviewDate?.toISOString(),
          respondent_initials: respondentInitials,
          specialty,
        })
        .eq('id', transcript.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Transcript metadata updated successfully',
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating transcript:', error);
      toast({
        title: 'Error',
        description: 'Failed to update transcript metadata',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit Transcript Metadata
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              placeholder="Enter custom name for this transcript"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-number">Project Number</Label>
            <Input
              id="project-number"
              placeholder="e.g., F04.24.832"
              value={projectNumber}
              onChange={(e) => setProjectNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="market">Market</Label>
            <Input
              id="market"
              placeholder="e.g., Germany"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Interview Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !interviewDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {interviewDate ? format(interviewDate, "PPP") : <span>Pick interview date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={interviewDate}
                  onSelect={setInterviewDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="respondent-initials">Respondent Initials</Label>
            <Input
              id="respondent-initials"
              placeholder="e.g., DE09"
              value={respondentInitials}
              onChange={(e) => setRespondentInitials(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Input
              id="specialty"
              placeholder="e.g., Ophthalmologist"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}