import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { enhancedExportService, TranscriptData, ExportOptions } from '@/services/enhanced-export-service';

interface TranscriptMetadata {
  projectNumber?: string;
  market?: string;
  interviewDate?: string;
  respondentInitials?: string;
  specialty?: string;
}
import { Download, FileText, FileImage, FileSpreadsheet } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptData & {
    metadata?: TranscriptMetadata;
  };
}

export function ExportDialog({ isOpen, onClose, transcript }: ExportDialogProps) {
  const [format, setFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf');
  const [includeFMRBranding, setIncludeFMRBranding] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document', icon: FileImage, description: 'Professional PDF with formatting' },
    { value: 'docx', label: 'Word Document', icon: FileText, description: 'Microsoft Word compatible' },
    { value: 'txt', label: 'Text File', icon: FileSpreadsheet, description: 'Plain text format' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format,
        includeFMRBranding,
        includeTimestamps,
        includeSpeakers,
      };

      await enhancedExportService.exportTranscript(transcript, options);
      
      toast({
        title: 'Export successful',
        description: `Transcript exported as ${format.toUpperCase()}`,
      });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the transcript',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Transcript
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup value={format} onValueChange={(value: any) => setFormat(value)}>
              {formatOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex items-center space-x-2 flex-1">
                    <option.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fmr-branding"
                  checked={includeFMRBranding}
                  onCheckedChange={(checked) => setIncludeFMRBranding(checked === true)}
                />
                <Label htmlFor="fmr-branding" className="text-sm cursor-pointer">
                  Include FMR Global Health branding
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="speakers"
                  checked={includeSpeakers}
                  onCheckedChange={(checked) => setIncludeSpeakers(checked === true)}
                />
                <Label htmlFor="speakers" className="text-sm cursor-pointer">
                  Include speaker identification (I:/R:)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="timestamps"
                  checked={includeTimestamps}
                  onCheckedChange={(checked) => setIncludeTimestamps(checked === true)}
                />
                <Label htmlFor="timestamps" className="text-sm cursor-pointer">
                  Include timestamps (if available)
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}